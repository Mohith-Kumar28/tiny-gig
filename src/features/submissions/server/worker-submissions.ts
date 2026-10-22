import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { gig, socialAccount, submission, submissionEvent, user } from '@/db/schema'
import { SUBMISSION_STATUSES } from '@/db/schema/enums'
import { queueEmail } from '@/emails/send-email'
import { audit } from '@/lib/server/activity'
import { accountLabel } from '@/features/accounts/rules'
import { workerSafeGig, workerSafeSubmission } from '../worker-safe'
import { AppError, workerMiddleware } from '@/lib/server/middleware'
import { rateLimit } from '@/lib/server/rate-limit'
import { alertRecipients, loadSettings } from '@/features/settings/server/settings-store'
import { insightsSchema, proofSchema } from '../schemas'
import { canWithdraw } from '../state'
import { applyInsights, applyProof } from './proof-service'
import { releaseSlotIfNeeded } from './review-service'


export const MY_WORK_TABS = ['active', 'in_review', 'approved', 'closed', 'all'] as const
export type MyWorkTab = (typeof MY_WORK_TABS)[number]

/** Which tab a task belongs in right now: an on-hold post whose hold is over needs the worker again. */
function inTab(tab: MyWorkTab, status: (typeof SUBMISSION_STATUSES)[number], liveCheckAt: Date | null, now: Date) {
  if (status === 'on_hold') {
    const due = !liveCheckAt || liveCheckAt <= now
    if (tab === 'active') return due
    if (tab === 'in_review') return !due
  }
  return TAB_STATUSES[tab].includes(status)
}

const TAB_STATUSES: Record<MyWorkTab, (typeof SUBMISSION_STATUSES)[number][]> = {
  // on_hold shows under "To do" once the hold is over and insights are due (see tabOf).
  active: ['claimed', 'changes_requested', 'on_hold'],
  in_review: ['submitted', 'resubmitted', 'live_check', 'on_hold', 'in_review'],
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
    const now = new Date()
    return rows.filter((r) => inTab(tab, r.status, r.liveCheckAt, now))
  })

export const getMyWorkCounts = createServerFn({ method: 'GET' })
  .middleware([workerMiddleware])
  .handler(async ({ context }) => {
    const rows = await context.db
      .select({ status: submission.status, liveCheckAt: submission.liveCheckAt })
      .from(submission)
      .where(eq(submission.workerId, context.user.id))
    const counts = Object.fromEntries(MY_WORK_TABS.map((t) => [t, 0])) as Record<MyWorkTab, number>
    const now = new Date()
    for (const r of rows) {
      for (const t of MY_WORK_TABS) if (inTab(t, r.status, r.liveCheckAt, now)) counts[t]++
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
    const r = await applyProof(db, {
      submissionId: data.submissionId,
      workerId: me.id,
      actor: { id: me.id, role: 'worker' },
      proofUrl: data.proofUrl,
      screenshotKeys: data.screenshotKeys,
      note: data.workerNote,
    })
    const settings = await loadSettings(db)
    if (settings.submissionAlerts === 'immediate' && (r.status === 'submitted' || r.status === 'resubmitted' || r.status === 'in_review')) {
      queueEmail({
        to: await alertRecipients(db),
        template: 'adminSubmissionReceived',
        data: { worker: profile.fullName, title: r.gig.title, resubmission: r.status === 'resubmitted' },
      })
    }
    return { status: r.status, liveCheckAt: r.liveCheckAt, warning: r.warning }
  })

/** Step two of the proof: the insights screenshot after the live hold (R32, R34). */
export const submitInsights = createServerFn({ method: 'POST' })
  .middleware([workerMiddleware])
  .validator(insightsSchema)
  .handler(async ({ data, context }) => {
    const { db, user: me, profile } = context
    await rateLimit(`insights:${me.id}`, 30, 3600)
    const r = await applyInsights(db, {
      submissionId: data.submissionId,
      workerId: me.id,
      actor: { id: me.id, role: 'worker' },
      insightsKeys: data.insightsKeys,
      karma: data.karma,
      note: data.workerNote,
    })
    const settings = await loadSettings(db)
    if (settings.submissionAlerts === 'immediate') {
      queueEmail({
        to: await alertRecipients(db),
        template: 'adminSubmissionReceived',
        data: { worker: profile.fullName, title: r.gig.title, resubmission: false },
      })
    }
    return { status: r.status }
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
