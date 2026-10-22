import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, inArray, isNotNull, like, lte, or, type SQL, sql } from 'drizzle-orm'
import { z } from 'zod'
import { gig, socialAccount, submission, submissionEvent, user, workerProfile } from '@/db/schema'
import { PLATFORMS, SUBMISSION_STATUSES } from '@/db/schema/enums'
import { notify } from '@/lib/server/activity'
import { AppError, adminMiddleware } from '@/lib/server/middleware'
import { facet, orderByFrom, pageArgs, paginated, tableSearchSchema } from '@/lib/table-query'
import { decideOne } from './review-service'

export const REVIEW_TABS = ['needs_review', 'resubmitted', 'live_check_due', 'live_check', 'changes_requested', 'all'] as const
export type ReviewTab = (typeof REVIEW_TABS)[number]

export const reviewSearchSchema = tableSearchSchema.extend({
  tab: z.enum(REVIEW_TABS).optional().catch(undefined),
  status: facet(SUBMISSION_STATUSES),
  platform: facet(PLATFORMS),
  gigId: z.string().optional().catch(undefined),
  workerId: z.string().optional().catch(undefined),
  /** Only submissions that have been posted (submitted at least once) — the post log. */
  posted: z.boolean().optional().catch(undefined),
  selected: z.string().optional().catch(undefined),
})
export type ReviewSearch = z.infer<typeof reviewSearchSchema>

function tabFilter(tab: ReviewTab, now: Date): SQL | undefined {
  switch (tab) {
    case 'needs_review':
      return inArray(submission.status, ['submitted', 'resubmitted'])
    case 'resubmitted':
      return eq(submission.status, 'resubmitted')
    case 'live_check_due':
      return and(eq(submission.status, 'live_check'), lte(submission.liveCheckAt, now))
    case 'live_check':
      return eq(submission.status, 'live_check')
    case 'changes_requested':
      return eq(submission.status, 'changes_requested')
    case 'all':
      return undefined
  }
}

export const listReviewQueue = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(reviewSearchSchema)
  .handler(async ({ data, context }) => {
    const { db } = context
    const now = new Date()
    const { limit, offset, page, perPage } = pageArgs({ ...data, perPage: data.perPage ?? 50 })
    const tab = data.tab ?? 'needs_review'
    const filters: SQL[] = []
    const tf = tabFilter(tab, now)
    if (tf) filters.push(tf)
    if (data.status?.length) filters.push(inArray(submission.status, data.status))
    if (data.platform?.length) filters.push(inArray(gig.platform, data.platform))
    if (data.gigId) filters.push(eq(submission.gigId, data.gigId))
    if (data.workerId) filters.push(eq(submission.workerId, data.workerId))
    if (data.posted) filters.push(isNotNull(submission.submittedAt))
    if (data.q) {
      const q = `%${data.q.toLowerCase()}%`
      filters.push(
        or(
          like(sql`lower(${gig.title})`, q),
          like(sql`lower(${workerProfile.fullName})`, q),
          like(sql`lower(${workerProfile.redditUsername})`, q),
          like(sql`lower(${submission.proofUrl})`, q),
        ) as SQL,
      )
    }
    const where = filters.length ? and(...filters) : undefined
    const fallback = data.posted
      ? desc(submission.submittedAt)
      : tab === 'live_check_due' || tab === 'live_check'
        ? asc(submission.liveCheckAt)
        : tab === 'all'
          ? desc(submission.updatedAt)
          : asc(submission.submittedAt)
    const orderBy = orderByFrom(
      data.sort,
      {
        submittedAt: submission.submittedAt,
        claimedAt: submission.claimedAt,
        liveCheckAt: submission.liveCheckAt,
        payout: submission.payoutAmount,
        worker: workerProfile.fullName,
        gig: gig.title,
        karma: workerProfile.karma,
        updatedAt: submission.updatedAt,
      },
      fallback,
    )

    const base = db
      .select({
        id: submission.id,
        status: submission.status,
        proofUrl: submission.proofUrl,
        screenshotCount: sql<number>`json_array_length(${submission.screenshotKeys})`,
        payoutAmount: submission.payoutAmount,
        claimedAt: submission.claimedAt,
        dueAt: submission.dueAt,
        submittedAt: submission.submittedAt,
        liveCheckAt: submission.liveCheckAt,
        decidedAt: submission.decidedAt,
        revision: submission.revision,
        updatedAt: submission.updatedAt,
        gigId: gig.id,
        gigTitle: gig.title,
        platform: gig.platform,
        taskType: gig.taskType,
        community: gig.community,
        workerId: workerProfile.userId,
        workerName: workerProfile.fullName,
        redditUsername: workerProfile.redditUsername,
        karma: workerProfile.karma,
        workerImage: user.image,
      })
      .from(submission)
      .innerJoin(gig, eq(gig.id, submission.gigId))
      .innerJoin(workerProfile, eq(workerProfile.userId, submission.workerId))
      .innerJoin(user, eq(user.id, submission.workerId))
      .where(where)

    const [rows, [totalRow]] = await Promise.all([
      base
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ n: count() })
        .from(submission)
        .innerJoin(gig, eq(gig.id, submission.gigId))
        .innerJoin(workerProfile, eq(workerProfile.userId, submission.workerId))
        .where(where),
    ])
    return paginated(rows, totalRow?.n ?? 0, page, perPage)
  })

export const getReviewCounts = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const now = Date.now()
    const [row] = await context.db
      .select({
        needs_review: sql<number>`sum(case when ${submission.status} in ('submitted','resubmitted') then 1 else 0 end)`,
        resubmitted: sql<number>`sum(case when ${submission.status} = 'resubmitted' then 1 else 0 end)`,
        live_check: sql<number>`sum(case when ${submission.status} = 'live_check' then 1 else 0 end)`,
        live_check_due: sql<number>`sum(case when ${submission.status} = 'live_check' and ${submission.liveCheckAt} <= ${now} then 1 else 0 end)`,
        changes_requested: sql<number>`sum(case when ${submission.status} = 'changes_requested' then 1 else 0 end)`,
        all: count(),
      })
      .from(submission)
    return Object.fromEntries(Object.entries(row ?? {}).map(([k, v]) => [k, Number(v ?? 0)])) as Record<ReviewTab, number>
  })

export const getSubmissionDetail = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db } = context
    const row = await db
      .select({ sub: submission, gig, worker: workerProfile, image: user.image })
      .from(submission)
      .innerJoin(gig, eq(gig.id, submission.gigId))
      .innerJoin(workerProfile, eq(workerProfile.userId, submission.workerId))
      .innerJoin(user, eq(user.id, submission.workerId))
      .where(eq(submission.id, data.id))
      .get()
    if (!row) throw new AppError('NOT_FOUND', 'Submission not found.')
    const [events, history, account] = await Promise.all([
      db
        .select({ event: submissionEvent, actorName: user.name })
        .from(submissionEvent)
        .leftJoin(user, eq(user.id, submissionEvent.actorId))
        .where(eq(submissionEvent.submissionId, data.id))
        .orderBy(asc(submissionEvent.createdAt)),
      db
        .select({ status: submission.status, n: count() })
        .from(submission)
        .where(eq(submission.workerId, row.sub.workerId))
        .groupBy(submission.status),
      row.sub.accountId ? db.select().from(socialAccount).where(eq(socialAccount.id, row.sub.accountId)).get() : Promise.resolve(undefined),
    ])
    return {
      submission: row.sub,
      gig: row.gig,
      worker: { ...row.worker, image: row.image },
      account: account ?? null,
      workerHistory: Object.fromEntries(history.map((h) => [h.status, h.n])) as Record<string, number>,
      events: events.map((e) => ({ ...e.event, actorName: e.actorName })),
    }
  })

export const decideSubmissions = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      ids: z.array(z.string()).min(1).max(200),
      decision: z.enum(['approve', 'request_changes', 'reject']),
      comment: z.string().trim().max(2000).optional(),
      checklist: z.array(z.string().max(200)).max(20).optional(),
      skipLiveCheck: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const results = []
    for (const id of data.ids) {
      results.push(await decideOne(context.db, context.user.id, id, data))
    }
    return {
      results,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok),
    }
  })

export const addSubmissionComment = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string(), comment: z.string().trim().min(1).max(2000) }))
  .handler(async ({ data, context }) => {
    const { db } = context
    const row = await db
      .select({ workerId: submission.workerId, title: gig.title, email: workerProfile.email })
      .from(submission)
      .innerJoin(gig, eq(gig.id, submission.gigId))
      .innerJoin(workerProfile, eq(workerProfile.userId, submission.workerId))
      .where(eq(submission.id, data.id))
      .get()
    if (!row) throw new AppError('NOT_FOUND', 'Submission not found.')
    await db.insert(submissionEvent).values({
      submissionId: data.id,
      actorId: context.user.id,
      actorRole: 'admin',
      action: 'comment',
      comment: data.comment,
    })
    await notify(db, [
      { userId: row.workerId, title: `New comment on ${row.title}`, body: data.comment, href: `/w/work/${data.id}` },
    ])
    return { ok: true }
  })
