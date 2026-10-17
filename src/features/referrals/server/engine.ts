import { and, count, eq, inArray, isNotNull, min, sum } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { referral, referralProgram, referralReward, workerProfile, submission, user } from '@/db/schema'
import { queueEmail } from '@/emails/send-email'
import { notify } from '@/lib/server/activity'
import { isProgramRunning, refereeQualifies, referrerTiersEarned } from '../rules'


/**
 * Links a new applicant to the referrer who owns `code`. Flags obvious
 * duplicate accounts (same phone / UPI / Reddit) for admin review.
 */
export async function attributeReferral(
  db: Db,
  referee: { userId: string; name: string; phone: string; upiId: string; redditUsername: string },
  rawCode: string | null | undefined,
) {
  const code = rawCode?.trim().toUpperCase()
  if (!code) return
  const existing = await db.query.referral.findFirst({ where: eq(referral.refereeId, referee.userId) })
  if (existing) return

  const referrer = await db.query.workerProfile.findFirst({ where: eq(workerProfile.ownReferralCode, code) })
  if (!referrer || referrer.userId === referee.userId) return

  const reasons: string[] = []
  if (referrer.phone === referee.phone) reasons.push('same phone')
  if (referrer.upiId.toLowerCase() === referee.upiId.toLowerCase()) reasons.push('same UPI ID')
  if (referrer.redditUsername.toLowerCase() === referee.redditUsername.toLowerCase()) reasons.push('same Reddit account')

  await db.insert(referral).values({
    referrerId: referrer.userId,
    refereeId: referee.userId,
    code,
    attributedAt: new Date(),
    flagged: reasons.length > 0,
    flagReason: reasons.length ? `Possible duplicate: ${reasons.join(', ')}` : null,
  })

  await notify(db, [
    { userId: referrer.userId, title: `${referee.name} joined with your link`, href: '/w/referrals' },
  ])
  queueEmail({ to: referrer.email, template: 'referralJoined', data: { name: referee.name } })
  await evaluateReferrer(db, referrer.userId)
}

/** Refreshes milestone data for a referee, then re-evaluates their referrer's programs. */
export async function syncReferee(db: Db, refereeId: string) {
  const ref = await db.query.referral.findFirst({ where: eq(referral.refereeId, refereeId) })
  if (!ref) return

  const [profile, stats] = await Promise.all([
    db.query.workerProfile.findFirst({ where: eq(workerProfile.userId, refereeId) }),
    db
      .select({
        approved: count(),
        earned: sum(submission.payoutAmount),
        firstAt: min(submission.decidedAt),
      })
      .from(submission)
      .where(and(eq(submission.workerId, refereeId), eq(submission.status, 'approved'))),
  ])
  const s = stats[0]
  const approvedAt = profile?.status === 'approved' ? (profile.reviewedAt ?? new Date()) : null
  const becameApproved = approvedAt && !ref.approvedAt

  await db
    .update(referral)
    .set({
      approvedAt,
      gigsApproved: s?.approved ?? 0,
      earned: Number(s?.earned ?? 0),
      firstGigApprovedAt: s?.firstAt ?? null,
    })
    .where(eq(referral.id, ref.id))

  if (becameApproved && profile) {
    const referrer = await db.query.user.findFirst({ where: eq(user.id, ref.referrerId) })
    if (referrer) {
      await notify(db, [{ userId: referrer.id, title: `Your referral ${profile.fullName} was approved`, href: '/w/referrals' }])
      queueEmail({ to: referrer.email, template: 'referralApproved', data: { name: profile.fullName } })
    }
  }
  await evaluateReferrer(db, ref.referrerId)
}

/** Idempotently creates any rewards the referrer (and their referees) have earned. */
export async function evaluateReferrer(db: Db, referrerId: string, now = new Date()) {
  const [programs, refs] = await Promise.all([
    db.query.referralProgram.findMany({ where: eq(referralProgram.active, true) }),
    db.query.referral.findMany({ where: eq(referral.referrerId, referrerId) }),
  ])
  const running = programs.filter((p) => isProgramRunning(p, now))
  if (!running.length || !refs.length) return

  const created: { workerId: string; amount: number; program: string; pendingReview: boolean }[] = []

  for (const program of running) {
    const qualified = refs.filter((r) => refereeQualifies(program, r, now))
    const status = program.autoApprove ? ('approved' as const) : ('pending_review' as const)
    const values: (typeof referralReward.$inferInsert)[] = []

    if (program.refereeReward > 0) {
      for (const r of qualified) {
        values.push({
          programId: program.id,
          workerId: r.refereeId,
          referralId: r.id,
          role: 'referee',
          tier: 1,
          amount: program.refereeReward,
          status,
        })
      }
    }
    if (program.referrerReward > 0) {
      const tiers = referrerTiersEarned(program, qualified.length)
      for (let tier = 1; tier <= tiers; tier++) {
        values.push({
          programId: program.id,
          workerId: referrerId,
          role: 'referrer',
          tier,
          amount: program.referrerReward,
          status,
        })
      }
    }
    if (!values.length) continue

    const inserted = await db.insert(referralReward).values(values).onConflictDoNothing().returning()
    for (const row of inserted) {
      created.push({
        workerId: row.workerId,
        amount: row.amount,
        program: program.name,
        pendingReview: row.status === 'pending_review',
      })
    }
  }

  if (!created.length) return
  await notify(
    db,
    created.map((c) => ({
      userId: c.workerId,
      title: `Referral reward earned`,
      body: `${c.program}: ${c.pendingReview ? 'pending verification' : 'added to your balance'}`,
      href: '/w/referrals',
    })),
  )
  const emails = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(user.id, [...new Set(created.map((c) => c.workerId))]))
  const byId = new Map(emails.map((e) => [e.id, e.email]))
  for (const c of created) {
    const to = byId.get(c.workerId)
    if (to)
      queueEmail({
        to,
        template: 'referralRewardEarned',
        data: { amount: c.amount, program: c.program, pendingReview: c.pendingReview },
      })
  }
}

/** Cron backstop: re-evaluates every referrer that has referrals. */
export async function evaluateAllReferrers(db: Db) {
  const referrers = await db
    .selectDistinct({ id: referral.referrerId })
    .from(referral)
    .where(isNotNull(referral.referrerId))
  for (const r of referrers) await evaluateReferrer(db, r.id)
}
