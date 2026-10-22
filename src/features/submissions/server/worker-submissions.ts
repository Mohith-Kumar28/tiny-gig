import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { gig, socialAccount, submission, submissionEvent, user, workerProfile } from '@/db/schema'
import { SUBMISSION_STATUSES } from '@/db/schema/enums'
import { queueEmail } from '@/emails/send-email'
import { audit } from '@/lib/server/activity'
import { accountLabel } from '@/features/accounts/rules'
import { workerSafeGig, workerSafeSubmission } from '../worker-safe'
import { AppError, workerMiddleware } from '@/lib/server/middleware'
import { rateLimit } from '@/lib/server/rate-limit'
import { alertRecipients, loadSettings } from '@/features/settings/server/settings-store'
import { proofSchema } from '../schemas'
import { canWithdraw, workerSubmitTransition } from '../state'
import { releaseSlotIfNeeded } from './review-service'


export const MY_WORK_TABS = ['active', 'in_review', 'approved', 'closed', 'all'] as const
export type MyWorkTab = (typeof MY_WORK_TABS)[number]

const TAB_STATUSES: Record<MyWorkTab, (typeof SUBMISSION_STATUSES)[number][]> = {
  active: ['claimed', 'changes_requested'],
  in_review: ['submitted', 'resubmitted', 'live_check'],
  approved: ['approved'],
  closed: ['rejected', 'expired', 'withdrawn'],
  all: [...SUBMISSION_STATUSES],
}

export const listMyWork = createServerFn({ method: 'GET' })
  .middleware([workerMiddleware])
  .validator(z.object({ tab: z.enum(MY_WORK_TABS).optional() }))
  .handler(async ({ data, context }) => {
    const tab = data.tab ?? 'active'
    const rows = await context.db
      .select({
        id: submission.id,
        status: submission.status,
        payoutAmount: submission.payoutAmount,
        claimedAt: submission.claimedAt,
        dueAt: submission.dueAt,
        submittedAt: submission.submittedAt,
        liveCheckAt: submission.liveCheckAt,
        decidedAt: submission.decidedAt,
        payoutId: submission.payoutId,
        proofUrl: submission.proofUrl,
        gigId: gig.id,
        gigTitle: gig.title,
        platform: gig.platform,
        taskType: gig.taskType,
        community: gig.community,
      })
      .from(submission)
      .innerJoin(gig, eq(gig.id, submission.gigId))
      .where(and(eq(submission.workerId, context.user.id), inArray(submission.status, TAB_STATUSES[tab])))
      .orderBy(desc(submission.updatedAt))
      .limit(300)
    return rows
  })

export const getMyWorkCounts = createServerFn({ method: 'GET' })
  .middleware([workerMiddleware])
  .handler(async ({ context }) => {
    const rows = await context.db
      .select({ status: submission.status })
      .from(submission)
      .where(eq(submission.workerId, context.user.id))
    const counts = Object.fromEntries(MY_WORK_TABS.map((t) => [t, 0])) as Record<MyWorkTab, number>
    for (const r of rows) {
      for (const t of MY_WORK_TABS) if (TAB_STATUSES[t].includes(r.status)) counts[t]++
    }
    return counts
  })

export const getMySubmission = createServerFn({ method: 'GET' })
  .middleware([workerMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db } = context
    const row = await db
      .select({ sub: submission, gig })
      .from(submission)
      .innerJoin(gig, eq(gig.id, submission.gigId))
      .where(and(eq(submission.id, data.id), eq(submission.workerId, context.user.id)))
      .get()
    if (!row) throw new AppError('NOT_FOUND', 'Task not found.')
    const events = await db
      .select({ event: submissionEvent, actorName: user.name })
      .from(submissionEvent)
      .leftJoin(user, eq(user.id, submissionEvent.actorId))
      .where(eq(submissionEvent.submissionId, data.id))
      .orderBy(asc(submissionEvent.createdAt))
    const account = row.sub.accountId
      ? await db.select({ platform: socialAccount.platform, handle: socialAccount.handle }).from(socialAccount).where(eq(socialAccount.id, row.sub.accountId)).get()
      : null
    return {
      submission: workerSafeSubmission(row.sub),
      gig: workerSafeGig(row.gig),
      account: account ? { label: accountLabel(account.platform, account.handle) } : null,
      events: events.map((e) => ({
        ...e.event,
        actorName: e.event.actorRole === 'admin' ? 'TinyGig reviewer' : e.actorName,
      })),
    }
  })

export const submitProof = createServerFn({ method: 'POST' })
  .middleware([workerMiddleware])
  .validator(proofSchema)
  .handler(async ({ data, context }) => {
    const { db, user: me, profile } = context
    await rateLimit(`submit:${me.id}`, 30, 3600)
    const row = await db
      .select({ sub: submission, gig })
      .from(submission)
      .innerJoin(gig, eq(gig.id, submission.gigId))
      .where(and(eq(submission.id, data.submissionId), eq(submission.workerId, me.id)))
      .get()
    if (!row) throw new AppError('NOT_FOUND', 'Task not found.')
    const t = workerSubmitTransition(row.sub.status)
    if (!t.ok) throw new AppError('CONFLICT', t.error)
    if (row.sub.dueAt < new Date()) throw new AppError('CONFLICT', 'The deadline for this task has passed.')
    const ownKeys = data.screenshotKeys.filter((k) => k.startsWith(`proofs/${me.id}/`))

    const now = new Date()
    await db.batch([
      db
        .update(submission)
        .set({
          status: t.status,
          proofUrl: data.proofUrl,
          screenshotKeys: ownKeys,
          workerNote: data.workerNote || null,
          submittedAt: now,
          // The post exists on the platform from this moment on — cooldowns count from here (R18).
          firstSubmittedAt: row.sub.firstSubmittedAt ?? now,
          revision: row.sub.revision + 1,
        })
        .where(eq(submission.id, row.sub.id)),
      db.insert(submissionEvent).values({
        submissionId: row.sub.id,
        actorId: me.id,
        actorRole: 'worker',
        action: t.status === 'resubmitted' ? 'resubmitted' : 'submitted',
        comment: data.workerNote || null,
      }),
      db.update(workerProfile).set({ lastActiveAt: now }).where(eq(workerProfile.userId, me.id)),
    ])

    const settings = await loadSettings(db)
    if (settings.submissionAlerts === 'immediate') {
      queueEmail({
        to: await alertRecipients(db),
        template: 'adminSubmissionReceived',
        data: { worker: profile.fullName, title: row.gig.title, resubmission: t.status === 'resubmitted' },
      })
    }
    return { status: t.status }
  })

export const withdrawClaim = createServerFn({ method: 'POST' })
  .middleware([workerMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user: me } = context
    const sub = await db.query.submission.findFirst({
      where: and(eq(submission.id, data.id), eq(submission.workerId, me.id)),
    })
    if (!sub) throw new AppError('NOT_FOUND', 'Task not found.')
    if (!canWithdraw(sub.status)) throw new AppError('CONFLICT', 'This task can no longer be withdrawn.')
    const release = releaseSlotIfNeeded(db, sub.gigId, sub.status, 'withdrawn')
    const update = db.update(submission).set({ status: 'withdrawn', decidedAt: new Date() }).where(eq(submission.id, sub.id))
    const event = db
      .insert(submissionEvent)
      .values({ submissionId: sub.id, actorId: me.id, actorRole: 'worker', action: 'withdrawn' })
    if (release) await db.batch([update, event, release])
    else await db.batch([update, event])
    await audit(db, { actorId: me.id, action: 'submission.withdrawn', entityType: 'submission', entityId: sub.id })
    return { ok: true }
  })
