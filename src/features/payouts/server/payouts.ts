import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, inArray, like, or, type SQL, sql } from 'drizzle-orm'
import { z } from 'zod'
import { payout, submission, referralReward, workerProfile, gig, referralProgram } from '@/db/schema'
import { PAYOUT_STATUSES } from '@/db/schema/enums'
import { queueEmail } from '@/emails/send-email'
import { audit, notify } from '@/lib/server/activity'
import { AppError, adminMiddleware, workerMiddleware } from '@/lib/server/middleware'
import { lockBalancesIntoPayouts, unpaidByWorker } from './payout-service'
import { facet, orderByFrom, pageArgs, paginated, tableSearchSchema } from '@/lib/table-query'


/** Unpaid, approved money per worker: gig earnings + approved referral rewards. */
export const getPayableBalances = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const { db } = context
    const balances = await unpaidByWorker(db)
    const ids = [...balances.keys()]
    if (!ids.length) return []
    const workers = await db
      .select({
        userId: workerProfile.userId,
        fullName: workerProfile.fullName,
        upiId: workerProfile.upiId,
        phone: workerProfile.phone,
        status: workerProfile.status,
      })
      .from(workerProfile)
      .where(inArray(workerProfile.userId, ids))
    return workers
      .map((w) => {
        const b = balances.get(w.userId)!
        return { ...w, ...b, total: b.gigAmount + b.rewardAmount }
      })
      .sort((a, b) => b.total - a.total)
  })

export const createPayouts = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ workerIds: z.array(z.string()).min(1).max(500), note: z.string().max(500).optional() }))
  .handler(async ({ data, context }) => {
    const r = await lockBalancesIntoPayouts(context.db, { workerIds: data.workerIds, actorId: context.user.id, note: data.note })
    return { created: r.created }
  })

export const payoutsSearchSchema = tableSearchSchema.extend({ status: facet(PAYOUT_STATUSES) })
export type PayoutsSearch = z.infer<typeof payoutsSearchSchema>

export const listPayouts = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(payoutsSearchSchema)
  .handler(async ({ data, context }) => {
    const { db } = context
    const { limit, offset, page, perPage } = pageArgs(data)
    const filters: SQL[] = []
    if (data.status?.length) filters.push(inArray(payout.status, data.status))
    if (data.q) {
      const q = `%${data.q.toLowerCase()}%`
      filters.push(
        or(
          like(sql`lower(${workerProfile.fullName})`, q),
          like(sql`lower(${payout.upiId})`, q),
          like(sql`lower(${payout.utrReference})`, q),
        ) as SQL,
      )
    }
    const where = filters.length ? and(...filters) : undefined
    const orderBy = orderByFrom(
      data.sort,
      { amount: payout.amount, createdAt: payout.createdAt, paidAt: payout.paidAt, worker: workerProfile.fullName },
      desc(payout.createdAt),
    )
    const [rows, [totalRow], [sums]] = await Promise.all([
      db
        .select({
          id: payout.id,
          workerId: payout.workerId,
          workerName: workerProfile.fullName,
          phone: workerProfile.phone,
          amount: payout.amount,
          status: payout.status,
          upiId: payout.upiId,
          utrReference: payout.utrReference,
          note: payout.note,
          paidAt: payout.paidAt,
          createdAt: payout.createdAt,
          items: sql<number>`(select count(*) from "submission" s where s."payout_id" = "payout"."id") + (select count(*) from "referral_reward" rr where rr."payout_id" = "payout"."id")`,
        })
        .from(payout)
        .innerJoin(workerProfile, eq(workerProfile.userId, payout.workerId))
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ n: count() })
        .from(payout)
        .innerJoin(workerProfile, eq(workerProfile.userId, payout.workerId))
        .where(where),
      db
        .select({
          pending: sql<number>`coalesce(sum(case when ${payout.status} in ('pending','processing') then ${payout.amount} end), 0)`,
          paid: sql<number>`coalesce(sum(case when ${payout.status} = 'paid' then ${payout.amount} end), 0)`,
        })
        .from(payout),
    ])
    return { ...paginated(rows, totalRow?.n ?? 0, page, perPage), sums: { pending: Number(sums?.pending ?? 0), paid: Number(sums?.paid ?? 0) } }
  })

export const getPayoutItems = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db } = context
    const [gigs, rewards] = await Promise.all([
      db
        .select({ id: submission.id, title: gig.title, amount: submission.payoutAmount, decidedAt: submission.decidedAt })
        .from(submission)
        .innerJoin(gig, eq(gig.id, submission.gigId))
        .where(eq(submission.payoutId, data.id)),
      db
        .select({ id: referralReward.id, program: referralProgram.name, amount: referralReward.amount, role: referralReward.role })
        .from(referralReward)
        .innerJoin(referralProgram, eq(referralProgram.id, referralReward.programId))
        .where(eq(referralReward.payoutId, data.id)),
    ])
    return { gigs, rewards }
  })

export const markPayoutsPaid = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      items: z.array(z.object({ id: z.string(), utr: z.string().trim().max(64).optional() })).min(1).max(500),
    }),
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const now = new Date()
    const rows = await db.query.payout.findMany({ where: inArray(payout.id, data.items.map((i) => i.id)) })
    const utrById = new Map(data.items.map((i) => [i.id, i.utr]))
    let updated = 0
    for (const p of rows) {
      if (p.status === 'paid') continue
      const utr = utrById.get(p.id) || null
      await db.batch([
        db.update(payout).set({ status: 'paid', utrReference: utr, paidAt: now, paidBy: user.id }).where(eq(payout.id, p.id)),
        db.update(referralReward).set({ status: 'paid' }).where(eq(referralReward.payoutId, p.id)),
      ])
      const w = await db.query.workerProfile.findFirst({ where: eq(workerProfile.userId, p.workerId) })
      if (w) queueEmail({ to: w.email, template: 'payoutSent', data: { amount: p.amount, upiId: p.upiId, utr } })
      await notify(db, [{ userId: p.workerId, title: 'Payment sent 💸', body: utr ? `UTR ${utr}` : undefined, href: '/w/payments' }])
      await audit(db, { actorId: user.id, action: 'payout.paid', entityType: 'payout', entityId: p.id, meta: { utr } })
      updated++
    }
    return { updated }
  })

export const setPayoutStatus = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string(), status: z.enum(['processing', 'failed', 'pending']), note: z.string().max(500).optional() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const p = await db.query.payout.findFirst({ where: eq(payout.id, data.id) })
    if (!p) throw new AppError('NOT_FOUND', 'Payout not found.')
    if (p.status === 'paid') throw new AppError('CONFLICT', 'This payout is already paid.')
    if (data.status === 'failed') {
      // Failed payouts release their items back to the worker's balance.
      await db.batch([
        db.update(payout).set({ status: 'failed', note: data.note ?? p.note }).where(eq(payout.id, p.id)),
        db.update(submission).set({ payoutId: null }).where(eq(submission.payoutId, p.id)),
        db.update(referralReward).set({ payoutId: null }).where(eq(referralReward.payoutId, p.id)),
      ])
    } else {
      await db.update(payout).set({ status: data.status, note: data.note ?? p.note }).where(eq(payout.id, p.id))
    }
    await audit(db, { actorId: user.id, action: `payout.${data.status}`, entityType: 'payout', entityId: p.id })
    return { ok: true }
  })

/* ---------- Worker ---------- */

export const getMyEarnings = createServerFn({ method: 'GET' })
  .middleware([workerMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context
    const [balances, [sums], payouts, recent] = await Promise.all([
      unpaidByWorker(db, [user.id]),
      db
        .select({
          processing: sql<number>`coalesce(sum(case when ${payout.status} in ('pending','processing') then ${payout.amount} end), 0)`,
          paid: sql<number>`coalesce(sum(case when ${payout.status} = 'paid' then ${payout.amount} end), 0)`,
        })
        .from(payout)
        .where(eq(payout.workerId, user.id)),
      db.query.payout.findMany({ where: eq(payout.workerId, user.id), orderBy: desc(payout.createdAt), limit: 100 }),
      db
        .select({
          id: submission.id,
          title: gig.title,
          amount: submission.payoutAmount,
          decidedAt: submission.decidedAt,
          payoutId: submission.payoutId,
        })
        .from(submission)
        .innerJoin(gig, eq(gig.id, submission.gigId))
        .where(and(eq(submission.workerId, user.id), eq(submission.status, 'approved')))
        .orderBy(desc(submission.decidedAt))
        .limit(50),
    ])
    const b = balances.get(user.id)
    const unpaid = (b?.gigAmount ?? 0) + (b?.rewardAmount ?? 0)
    const processing = Number(sums?.processing ?? 0)
    const paid = Number(sums?.paid ?? 0)
    return { unpaid, processing, paid, lifetime: unpaid + processing + paid, payouts, recent }
  })
