import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { gig, gigInterest, submission } from '@/db/schema'
import { PLATFORMS, TASK_TYPES } from '@/db/schema/enums'
import { AppError, workerMiddleware } from '@/lib/server/middleware'
import { type Evaluation, workerBlockReason } from '@/features/accounts/cooldowns'
import { accountLabel, levelFor } from '@/features/accounts/rules'
import { type EligibilityContext, evaluateWorker, gigFacts, loadEligibility } from '@/features/accounts/server/eligibility'
import { rateFor, ratePreview, rateRange, usesLevels } from '@/features/opportunities/server/rates'
import { workerSafeGig } from '@/features/submissions/worker-safe'
import { gigClosedReason } from '../eligibility'


/**
 * Pay as a worker sees it: a range for everyone (R28), and for a signed-in worker the rate with
 * their best eligible account plus what the next level pays (R29).
 */
function payFor(g: typeof gig.$inferSelect, evals: Evaluation[], ctx: EligibilityContext, userId: string, now: Date) {
  const range = rateRange(g, ctx.settings)
  const accounts = ctx.accountsByWorker.get(userId) ?? []
  const candidates = evals
    .filter((e) => e.ok || !e.hard.length)
    .map((e) => accounts.find((a) => a.id === e.accountId))
    .filter((a): a is NonNullable<typeof a> => !!a)
  const best = candidates
    .map((a) => ({ a, p: ratePreview(g, a.createdOn, ctx.settings, now) }))
    .sort((x, y) => y.p.rate - x.p.rate)[0]
  return {
    min: range.min,
    max: range.max,
    byLevel: usesLevels(g),
    mine: best && usesLevels(g) ? { rate: best.p.rate, label: accountLabel(best.a.platform, best.a.handle), next: best.p.next } : null,
  }
}

export const availableGigsSearchSchema = z.object({
  platform: z.array(z.enum(PLATFORMS)).optional().catch(undefined),
  taskType: z.array(z.enum(TASK_TYPES)).optional().catch(undefined),
  sort: z.enum(['newest', 'pay', 'ending']).optional().catch(undefined),
  eligibleOnly: z.boolean().optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
})
export type AvailableGigsSearch = z.infer<typeof availableGigsSearchSchema>

export const listAvailableGigs = createServerFn({ method: 'GET' })
  .middleware([workerMiddleware])
  .validator(availableGigsSearchSchema)
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const filters = [eq(gig.status, 'live'), lt(gig.claimedSlots, gig.totalSlots)]
    if (data.platform?.length) filters.push(inArray(gig.platform, data.platform))
    if (data.taskType?.length) filters.push(inArray(gig.taskType, data.taskType))
    if (data.q) filters.push(sql`lower(${gig.title}) like ${`%${data.q.toLowerCase()}%`}`)
    const orderBy =
      data.sort === 'pay'
        ? [desc(gig.payoutAmount)]
        : data.sort === 'ending'
          ? [sql`coalesce(${gig.endsAt}, 9e15) asc`]
          : [desc(gig.priority), desc(gig.publishedAt)]

    const [rows, mine, interests] = await Promise.all([
      db.select().from(gig).where(and(...filters)).orderBy(...orderBy).limit(200),
      db.select({ gigId: submission.gigId }).from(submission).where(eq(submission.workerId, user.id)),
      db.select({ gigId: gigInterest.gigId, status: gigInterest.status }).from(gigInterest).where(eq(gigInterest.workerId, user.id)),
    ])
    const interestBy = new Map(interests.map((i) => [i.gigId, i.status]))
    const taken = new Set(mine.map((m) => m.gigId))
    const now = new Date()
    const ctx = await loadEligibility(db, [user.id])
    const gigs = rows
      .filter((g) => !taken.has(g.id))
      .map((g) => {
        const evals = evaluateWorker(ctx, user.id, gigFacts(g), now)
        const block = gigClosedReason(g, now) ? null : workerBlockReason(evals, now)
        return {
        id: g.id,
        title: g.title,
        platform: g.platform,
        taskType: g.taskType,
        community: g.community,
        payoutAmount: g.payoutAmount,
        totalSlots: g.totalSlots,
        claimedSlots: g.claimedSlots,
        claimWindowHours: g.claimWindowHours,
        liveHoldHours: g.liveHoldHours,
        endsAt: g.endsAt,
        publishedAt: g.publishedAt,
        minKarma: g.minKarma,
        minAccountAgeMonths: g.minAccountAgeMonths,
        ineligible: gigClosedReason(g, now) ?? block?.message ?? null,
        unlockAt: block?.unlockAt ?? null,
        interest: interestBy.get(g.id) ?? null,
        interestClosesAt: g.interestClosesAt,
        pay: payFor(g, evals, ctx, user.id, now),
      }
      })
    return data.eligibleOnly ? gigs.filter((g) => !g.ineligible) : gigs
  })

export const getGigForWorker = createServerFn({ method: 'GET' })
  .middleware([workerMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const g = await db.query.gig.findFirst({ where: eq(gig.id, data.id) })
    if (!g || g.status === 'draft') throw new AppError('NOT_FOUND', 'Gig not found.')
    const [mine, interest] = await Promise.all([
      db.query.submission.findFirst({
        where: and(eq(submission.gigId, g.id), eq(submission.workerId, user.id)),
        columns: { id: true, status: true },
      }),
      db
        .select({ status: gigInterest.status, accountIds: gigInterest.accountIds })
        .from(gigInterest)
        .where(and(eq(gigInterest.gigId, g.id), eq(gigInterest.workerId, user.id)))
        .get(),
    ])
    const now = new Date()
    const ctx = await loadEligibility(db, [user.id])
    const evals = evaluateWorker(ctx, user.id, gigFacts(g), now)
    const accounts = ctx.accountsByWorker.get(user.id) ?? []
    const block = mine ? null : workerBlockReason(evals, now)
    // Worker-facing: account labels and plain-language reasons only — never client names (R44).
    const myAccounts = evals
      .filter((e) => !e.hard.some((b) => b.rule === 'platform'))
      .map((e) => {
        const a = accounts.find((x) => x.id === e.accountId)
        const first = [...e.hard, ...e.soft][0]
        return {
          id: e.accountId,
          label: a ? accountLabel(a.platform, a.handle) : '',
          rate: a ? rateFor(g, levelFor(a.createdOn, now), a.platform, ctx.settings) : null,
          level: e.facts.level,
          ok: e.ok,
          reason: first?.workerMessage ?? null,
          unlockAt: first?.unlockAt ?? null,
        }
      })
    return {
      gig: workerSafeGig(g),
      mySubmission: mine ?? null,
      ineligible: mine ? null : (gigClosedReason(g, now) ?? block?.message ?? null),
      unlockAt: block?.unlockAt ?? null,
      myAccounts,
      interest: interest ?? null,
      pay: payFor(g, evals, ctx, user.id, now),
    }
  })
