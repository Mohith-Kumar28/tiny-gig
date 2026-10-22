import { createServerFn } from '@tanstack/react-start'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { gig, gigInterest, socialAccount, submission, workerProfile } from '@/db/schema'
import { type Candidate, type Evaluation, rankCandidates, reasonLine } from '@/features/accounts/cooldowns'
import { accountLabel } from '@/features/accounts/rules'
import { evaluateWorker, gigFacts, loadEligibility } from '@/features/accounts/server/eligibility'
import { adminMiddleware, AppError } from '@/lib/server/middleware'
import { assignAccount, previewAccountForGig } from './assign'

function describe(ev: Evaluation) {
  return {
    ok: ev.ok,
    hard: ev.hard.map((b) => ({ rule: b.rule, message: b.message })),
    soft: ev.soft.map((b) => ({ rule: b.rule, message: b.message, unlockAt: b.unlockAt })),
    facts: ev.facts,
  }
}

/**
 * The selection screen (§4.2): every account offered by interested workers, side by side,
 * sorted best-fit first with the reason in words. The system sorts; the human decides.
 */
export const getSelection = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(z.object({ gigId: z.string() }))
  .handler(async ({ data, context }) => {
    const { db } = context
    const g = await db.select().from(gig).where(eq(gig.id, data.gigId)).get()
    if (!g) throw new AppError('NOT_FOUND', 'Gig not found.')
    const now = new Date()
    const [interests, assigned] = await Promise.all([
      db
        .select({ interest: gigInterest, name: workerProfile.fullName, phone: workerProfile.phone })
        .from(gigInterest)
        .innerJoin(workerProfile, eq(workerProfile.userId, gigInterest.workerId))
        .where(eq(gigInterest.gigId, g.id)),
      db
        .select({
          id: submission.id,
          status: submission.status,
          workerName: workerProfile.fullName,
          handle: socialAccount.handle,
          platform: socialAccount.platform,
          level: submission.level,
          payoutAmount: submission.payoutAmount,
          overrideReason: submission.overrideReason,
          selectedAt: submission.selectedAt,
        })
        .from(submission)
        .innerJoin(workerProfile, eq(workerProfile.userId, submission.workerId))
        .leftJoin(socialAccount, eq(socialAccount.id, submission.accountId))
        .where(eq(submission.gigId, g.id)),
    ])
    const waiting = interests.filter((i) => i.interest.status === 'interested')
    const ctx = await loadEligibility(db, waiting.map((i) => i.interest.workerId))
    const facts = gigFacts(g)
    const cands: (Candidate & {
      workerId: string
      workerName: string
      phone: string
      platform: string
      label: string
      karmaUpdatedAt: Date | null
      interestedAt: Date
    })[] = []
    for (const i of waiting) {
      const evals = evaluateWorker(ctx, i.interest.workerId, facts, now)
      const accounts = ctx.accountsByWorker.get(i.interest.workerId) ?? []
      for (const e of evals) {
        if (!i.interest.accountIds.includes(e.accountId)) continue
        const a = accounts.find((x) => x.id === e.accountId)
        if (!a) continue
        cands.push({
          accountId: a.id,
          handle: a.handle,
          evaluation: e,
          community: facts.community,
          workerId: i.interest.workerId,
          workerName: i.name,
          phone: i.phone,
          platform: a.platform,
          label: accountLabel(a.platform, a.handle),
          karmaUpdatedAt: a.karmaUpdatedAt,
          interestedAt: i.interest.createdAt,
        })
      }
    }
    const ranked = rankCandidates(cands).map((c) => ({
      accountId: c.accountId,
      workerId: c.workerId,
      workerName: c.workerName,
      phone: c.phone,
      platform: c.platform,
      label: c.label,
      karmaUpdatedAt: c.karmaUpdatedAt,
      interestedAt: c.interestedAt,
      reason: reasonLine(c, now, { withHandle: false }),
      lastClient: c.evaluation.facts.lastClientTagId ? ctx.clientName(c.evaluation.facts.lastClientTagId) : null,
      ...describe(c.evaluation),
    }))
    return {
      gig: { ...g, slotsLeft: Math.max(0, g.totalSlots - g.claimedSlots) },
      windowOpen: g.interestClosesAt ? g.interestClosesAt > now : false,
      candidates: ranked,
      counts: {
        interested: waiting.length,
        selected: interests.filter((i) => i.interest.status === 'selected').length,
        withdrawn: interests.filter((i) => i.interest.status === 'withdrawn').length,
      },
      assigned,
    }
  })

/** Accounts matching a search, evaluated against this gig — for direct assignment (R11). */
export const searchAssignable = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(z.object({ gigId: z.string(), q: z.string().trim().max(80) }))
  .handler(async ({ data, context }) => {
    const { db } = context
    const g = await db.select().from(gig).where(eq(gig.id, data.gigId)).get()
    if (!g) throw new AppError('NOT_FOUND', 'Gig not found.')
    const q = `%${data.q.toLowerCase().replace(/^u\//, '')}%`
    const matches = await db
      .select({ id: socialAccount.id, workerId: socialAccount.workerId, handle: socialAccount.handle, platform: socialAccount.platform, name: workerProfile.fullName })
      .from(socialAccount)
      .innerJoin(workerProfile, eq(workerProfile.userId, socialAccount.workerId))
      .where(
        and(
          eq(workerProfile.status, 'approved'),
          g.platform === 'other' ? undefined : eq(socialAccount.platform, g.platform as 'reddit'),
          data.q ? sql`(lower(${socialAccount.handle}) like ${q} or lower(${workerProfile.fullName}) like ${q} or ${workerProfile.phone} like ${q})` : undefined,
        ),
      )
      .limit(25)
    const now = new Date()
    const ctx = await loadEligibility(db, matches.map((m) => m.workerId))
    const facts = gigFacts(g)
    const cands = matches.flatMap((m) => {
      const e = evaluateWorker(ctx, m.workerId, facts, now).find((x) => x.accountId === m.id)
      return e ? [{ accountId: m.id, handle: m.handle, evaluation: e, community: facts.community, m }] : []
    })
    return rankCandidates(cands).map((c) => ({
      accountId: c.accountId,
      workerId: c.m.workerId,
      workerName: c.m.name,
      label: accountLabel(c.m.platform, c.m.handle),
      reason: reasonLine(c, now, { withHandle: false }),
      ...describe(c.evaluation),
    }))
  })

export const previewAssignment = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(z.object({ gigId: z.string(), accountId: z.string() }))
  .handler(async ({ data, context }) => {
    const g = await context.db.select().from(gig).where(eq(gig.id, data.gigId)).get()
    if (!g) throw new AppError('NOT_FOUND', 'Gig not found.')
    const { account, evaluation } = await previewAccountForGig(context.db, g, data.accountId)
    const owner = await context.db.select({ name: workerProfile.fullName }).from(workerProfile).where(eq(workerProfile.userId, account.workerId)).get()
    return { label: accountLabel(account.platform, account.handle), workerName: owner?.name ?? 'The worker', ...describe(evaluation) }
  })

export const selectAccount = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ gigId: z.string(), accountId: z.string(), overrideReason: z.string().trim().max(500).optional(), direct: z.boolean().optional() }))
  .handler(({ data, context }) => assignAccount(context.db, { ...data, actorId: context.user.id }))

/** Live gigs with open slots — for "assign to opportunity" from the roster. */
export const listOpenOpportunities = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(({ context }) =>
    context.db
      .select({ id: gig.id, title: gig.title, platform: gig.platform, community: gig.community, totalSlots: gig.totalSlots, claimedSlots: gig.claimedSlots })
      .from(gig)
      .where(and(eq(gig.status, 'live'), sql`${gig.claimedSlots} < ${gig.totalSlots}`))
      .orderBy(sql`${gig.publishedAt} desc`)
      .limit(50),
  )


