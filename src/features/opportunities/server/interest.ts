import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { gig, gigInterest } from '@/db/schema'
import { workerBlockReason } from '@/features/accounts/cooldowns'
import { evaluateWorker, gigFacts, loadEligibility, logBlocks } from '@/features/accounts/server/eligibility'
import { gigClosedReason } from '@/features/gigs/eligibility'
import { AppError, workerMiddleware } from '@/lib/server/middleware'
import { rateLimit } from '@/lib/server/rate-limit'

/** "I'm interested" — reserves nothing (§4.1.3). Only accounts that pass every rule are offered. */
export const expressInterest = createServerFn({ method: 'POST' })
  .middleware([workerMiddleware])
  .validator(z.object({ gigId: z.string(), accountIds: z.array(z.string()).max(20).optional() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context
    await rateLimit(`interest:${user.id}`, 60, 3600)
    const g = await db.select().from(gig).where(eq(gig.id, data.gigId)).get()
    if (!g) throw new AppError('NOT_FOUND', 'Gig not found.')
    const closed = gigClosedReason(g)
    if (closed) throw new AppError('CONFLICT', closed)
    const now = new Date()
    const ctx = await loadEligibility(db, [user.id])
    const evals = evaluateWorker(ctx, user.id, gigFacts(g), now)
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
    const ok = evals.filter((e) => e.ok).map((e) => e.accountId)
    const offered = data.accountIds?.length ? ok.filter((id) => data.accountIds?.includes(id)) : ok
    if (!offered.length) throw new AppError('BAD_REQUEST', 'Pick at least one account that can do this gig.')
    const existing = await db
      .select({ status: gigInterest.status })
      .from(gigInterest)
      .where(and(eq(gigInterest.gigId, g.id), eq(gigInterest.workerId, user.id)))
      .get()
    if (existing?.status === 'selected') throw new AppError('CONFLICT', 'You’ve already been selected for this gig.')
    await db
      .insert(gigInterest)
      .values({ gigId: g.id, workerId: user.id, accountIds: offered, status: 'interested' })
      .onConflictDoUpdate({ target: [gigInterest.gigId, gigInterest.workerId], set: { accountIds: offered, status: 'interested', updatedAt: now } })
    return { ok: true, accounts: offered.length }
  })

export const withdrawInterest = createServerFn({ method: 'POST' })
  .middleware([workerMiddleware])
  .validator(z.object({ gigId: z.string() }))
  .handler(async ({ data, context }) => {
    await context.db
      .update(gigInterest)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(and(eq(gigInterest.gigId, data.gigId), eq(gigInterest.workerId, context.user.id), eq(gigInterest.status, 'interested')))
    return { ok: true }
  })
