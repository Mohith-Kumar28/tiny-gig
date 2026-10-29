import { and, count, eq, inArray, isNull, type SQL, sql } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { inChunks } from '@/db/in-chunks'
import { payout, referralReward, submission, workerProfile } from '@/db/schema'
import { audit } from '@/lib/server/activity'

export async function unpaidByWorker(db: Db, workerIds?: string[]) {
  const unpaidWork = (forWorkers?: SQL) =>
    db
      .select({ workerId: submission.workerId, amount: sql<number>`sum(${submission.payoutAmount})`, n: count() })
      .from(submission)
      .where(and(eq(submission.status, 'approved'), isNull(submission.payoutId), forWorkers))
      .groupBy(submission.workerId)
  const unpaidRewards = (forWorkers?: SQL) =>
    db
      .select({ workerId: referralReward.workerId, amount: sql<number>`sum(${referralReward.amount})`, n: count() })
      .from(referralReward)
      .where(and(eq(referralReward.status, 'approved'), isNull(referralReward.payoutId), forWorkers))
      .groupBy(referralReward.workerId)
  // Grouped by worker, so per-chunk results never overlap.
  const [subs, rewards] = await Promise.all(
    workerIds
      ? [
          inChunks(db, workerIds, (ids) => unpaidWork(inArray(submission.workerId, ids))),
          inChunks(db, workerIds, (ids) => unpaidRewards(inArray(referralReward.workerId, ids))),
        ]
      : [unpaidWork(), unpaidRewards()],
  )
  const map = new Map<string, { gigAmount: number; gigCount: number; rewardAmount: number; rewardCount: number }>()
  for (const s of subs) map.set(s.workerId, { gigAmount: Number(s.amount), gigCount: s.n, rewardAmount: 0, rewardCount: 0 })
  for (const r of rewards) {
    const cur = map.get(r.workerId) ?? { gigAmount: 0, gigCount: 0, rewardAmount: 0, rewardCount: 0 }
    cur.rewardAmount = Number(r.amount)
    cur.rewardCount = r.n
    map.set(r.workerId, cur)
  }
  return map
}

/**
 * Locks each worker's unpaid balance (approved work + approved referral rewards) into one pending
 * payout. Shared by the manual "Create payouts" action and the weekly run (§13, answer 9).
 */
export async function lockBalancesIntoPayouts(db: Db, opts: { workerIds?: string[]; actorId: string | null; note?: string | null }) {
  const balances = await unpaidByWorker(db, opts.workerIds)
  if (!balances.size) return { created: 0, total: 0 }
  const profiles = await inChunks(db, [...balances.keys()], (ids) => db.query.workerProfile.findMany({ where: inArray(workerProfile.userId, ids) }))
  let created = 0
  let total = 0
  for (const p of profiles) {
    const b = balances.get(p.userId)
    const amount = (b?.gigAmount ?? 0) + (b?.rewardAmount ?? 0)
    if (!b || amount <= 0) continue
    const [row] = await db
      .insert(payout)
      .values({ workerId: p.userId, amount, status: 'pending', upiId: p.upiId, note: opts.note ?? null, createdBy: opts.actorId })
      .returning({ id: payout.id })
    if (!row) continue
    await db.batch([
      db
        .update(submission)
        .set({ payoutId: row.id })
        .where(and(eq(submission.workerId, p.userId), eq(submission.status, 'approved'), isNull(submission.payoutId))),
      db
        .update(referralReward)
        .set({ payoutId: row.id })
        .where(and(eq(referralReward.workerId, p.userId), eq(referralReward.status, 'approved'), isNull(referralReward.payoutId))),
    ])
    await audit(db, { actorId: opts.actorId, action: 'payout.create', entityType: 'payout', entityId: row.id, meta: { amount } })
    created++
    total += amount
  }
  return { created, total }
}

