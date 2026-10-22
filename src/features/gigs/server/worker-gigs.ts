import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { gig, submission, submissionEvent, workerProfile } from '@/db/schema'
import { PLATFORMS, TASK_TYPES } from '@/db/schema/enums'
import { queueEmail } from '@/emails/send-email'
import { AppError, workerMiddleware } from '@/lib/server/middleware'
import { rateLimit } from '@/lib/server/rate-limit'
import { rankCandidates, workerBlockReason } from '@/features/accounts/cooldowns'
import { accountLabel, levelFor } from '@/features/accounts/rules'
import { evaluateWorker, gigFacts, loadEligibility, logBlocks } from '@/features/accounts/server/eligibility'
import { workerSafeGig } from '@/features/submissions/worker-safe'
import { gigClosedReason } from '../eligibility'


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

    const [rows, mine] = await Promise.all([
      db.select().from(gig).where(and(...filters)).orderBy(...orderBy).limit(200),
      db.select({ gigId: submission.gigId }).from(submission).where(eq(submission.workerId, user.id)),
    ])
    const taken = new Set(mine.map((m) => m.gigId))
    const now = new Date()
    const ctx = await loadEligibility(db, [user.id])
    const gigs = rows
      .filter((g) => !taken.has(g.id))
      .map((g) => {
        const block = gigClosedReason(g, now) ? null : workerBlockReason(evaluateWorker(ctx, user.id, gigFacts(g), now), now)
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
    const mine = await db.query.submission.findFirst({
      where: and(eq(submission.gigId, g.id), eq(submission.workerId, user.id)),
      columns: { id: true, status: true },
    })
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
    }
  })

/**
 * Atomic slot claim: the conditional UPDATE only succeeds while slots remain,
 * so concurrent claims can never oversell a gig.
 */
export const claimGig = createServerFn({ method: 'POST' })
  .middleware([workerMiddleware])
  .validator(z.object({ gigId: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, profile, user } = context
    await rateLimit(`claim:${user.id}`, 20, 3600)
    const g = await db.query.gig.findFirst({ where: eq(gig.id, data.gigId) })
    if (!g) throw new AppError('NOT_FOUND', 'Gig not found.')
    const closed = gigClosedReason(g)
    if (closed) throw new AppError('FORBIDDEN', closed)
    const now = new Date()
    const facts = gigFacts(g)
    const ctx = await loadEligibility(db, [user.id])
    const evals = evaluateWorker(ctx, user.id, facts, now)
    const block = workerBlockReason(evals, now)
    if (block) {
      const seen = new Set<string>()
      await logBlocks(
        db,
        'interest',
        g.id,
        evals
          .flatMap((e) => [...e.hard, ...e.soft].map((b) => ({ workerId: user.id, accountId: e.accountId, block: b })))
          .filter((x) => x.block.rule !== 'platform' && !seen.has(x.block.rule) && seen.add(x.block.rule)),
      )
      throw new AppError('FORBIDDEN', block.message)
    }
    const accounts = ctx.accountsByWorker.get(user.id) ?? []
    const [best] = rankCandidates(
      evals
        .filter((e) => e.ok)
        .map((e) => ({ accountId: e.accountId, handle: accounts.find((a) => a.id === e.accountId)?.handle ?? '', evaluation: e, community: facts.community })),
    )
    const account = accounts.find((a) => a.id === best?.accountId)
    const existing = await db.query.submission.findFirst({
      where: and(eq(submission.gigId, g.id), eq(submission.workerId, user.id)),
    })
    if (existing) throw new AppError('CONFLICT', 'You already took this gig.')

    const reserved = await db
      .update(gig)
      .set({ claimedSlots: sql`${gig.claimedSlots} + 1` })
      .where(and(eq(gig.id, g.id), eq(gig.status, 'live'), lt(gig.claimedSlots, gig.totalSlots)))
      .returning({ id: gig.id })
    if (!reserved.length) throw new AppError('CONFLICT', 'Sorry, all slots were just taken.')

    const dueAt = new Date(now.getTime() + g.claimWindowHours * 3_600_000)
    try {
      const [created] = await db
        .insert(submission)
        .values({
          gigId: g.id,
          workerId: user.id,
          status: 'claimed',
          payoutAmount: g.payoutAmount,
          claimedAt: now,
          dueAt,
          accountId: account?.id ?? null,
          clientTagId: g.clientTagId,
          community: facts.community,
          level: account ? levelFor(account.createdOn, now) : null,
        })
        .returning({ id: submission.id })
      if (!created) throw new Error('insert failed')
      await db.batch([
        db.insert(submissionEvent).values({ submissionId: created.id, actorId: user.id, actorRole: 'worker', action: 'claimed' }),
        db.update(workerProfile).set({ lastActiveAt: now }).where(eq(workerProfile.userId, user.id)),
      ])
      queueEmail({
        to: profile.email,
        template: 'claimConfirmed',
        data: {
          title: g.title,
          dueAt: dueAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }),
          submissionId: created.id,
        },
      })
      return { submissionId: created.id }
    } catch (err) {
      await db
        .update(gig)
        .set({ claimedSlots: sql`max(0, ${gig.claimedSlots} - 1)` })
        .where(eq(gig.id, g.id))
      throw err instanceof AppError ? err : new AppError('CONFLICT', 'Could not claim this gig. Try again.')
    }
  })
