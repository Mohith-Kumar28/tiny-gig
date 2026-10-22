import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, gte, inArray, sql } from 'drizzle-orm'
import { submission, workerProfile, gig, payout, referralReward } from '@/db/schema'
import { adminMiddleware, workerMiddleware } from '@/lib/server/middleware'


/** IST calendar day for an epoch-ms column. */
const istDay = (col: unknown) => sql<string>`strftime('%Y-%m-%d', ${col} / 1000, 'unixepoch', '+5 hours', '+30 minutes')`
const istWeek = (col: unknown) =>
  sql<string>`strftime('%Y-%m-%d', ${col} / 1000, 'unixepoch', '+5 hours', '+30 minutes', '-6 days', 'weekday 1')`

function lastNDays(n: number) {
  const days: string[] = []
  const now = new Date(Date.now() + 5.5 * 3_600_000)
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

export const getAdminOverview = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const { db } = context
    const now = Date.now()
    const since30 = new Date(now - 30 * 86_400_000)
    const since84 = new Date(now - 84 * 86_400_000)

    const [[workers], [subs], [gigs], [money], submittedSeries, decidedSeries, payoutSeries, oldest, [rewards]] =
      await Promise.all([
        db
          .select({
            pending: sql<number>`sum(case when ${workerProfile.status} = 'pending' then 1 else 0 end)`,
            approved: sql<number>`sum(case when ${workerProfile.status} = 'approved' then 1 else 0 end)`,
            active7d: sql<number>`sum(case when ${workerProfile.lastActiveAt} >= ${now - 7 * 86_400_000} then 1 else 0 end)`,
          })
          .from(workerProfile),
        db
          .select({
            needsReview: sql<number>`sum(case when ${submission.status} in ('submitted','resubmitted') then 1 else 0 end)`,
            liveCheckDue: sql<number>`sum(case when ${submission.status} = 'live_check' and ${submission.liveCheckAt} <= ${now} then 1 else 0 end)`,
            inProgress: sql<number>`sum(case when ${submission.status} in ('claimed','changes_requested') then 1 else 0 end)`,
            expiringSoon: sql<number>`sum(case when ${submission.status} in ('claimed','changes_requested') and ${submission.dueAt} <= ${now + 6 * 3_600_000} then 1 else 0 end)`,
            approved30: sql<number>`sum(case when ${submission.status} = 'approved' and ${submission.decidedAt} >= ${since30.getTime()} then 1 else 0 end)`,
            rejected30: sql<number>`sum(case when ${submission.status} = 'rejected' and ${submission.decidedAt} >= ${since30.getTime()} then 1 else 0 end)`,
            unpaid: sql<number>`coalesce(sum(case when ${submission.status} = 'approved' and ${submission.payoutId} is null then ${submission.payoutAmount} end), 0)`,
          })
          .from(submission),
        db
          .select({
            live: sql<number>`sum(case when ${gig.status} = 'live' then 1 else 0 end)`,
            openSlots: sql<number>`coalesce(sum(case when ${gig.status} = 'live' then ${gig.totalSlots} - ${gig.claimedSlots} end), 0)`,
          })
          .from(gig),
        db
          .select({
            inPayout: sql<number>`coalesce(sum(case when ${payout.status} in ('pending','processing') then ${payout.amount} end), 0)`,
            paid30: sql<number>`coalesce(sum(case when ${payout.status} = 'paid' and ${payout.paidAt} >= ${since30.getTime()} then ${payout.amount} end), 0)`,
            paidAll: sql<number>`coalesce(sum(case when ${payout.status} = 'paid' then ${payout.amount} end), 0)`,
          })
          .from(payout),
        db
          .select({ day: istDay(submission.submittedAt), n: count() })
          .from(submission)
          .where(gte(submission.submittedAt, since30))
          .groupBy(istDay(submission.submittedAt)),
        db
          .select({
            day: istDay(submission.decidedAt),
            approved: sql<number>`sum(case when ${submission.status} = 'approved' then 1 else 0 end)`,
            rejected: sql<number>`sum(case when ${submission.status} = 'rejected' then 1 else 0 end)`,
          })
          .from(submission)
          .where(gte(submission.decidedAt, since30))
          .groupBy(istDay(submission.decidedAt)),
        db
          .select({ week: istWeek(payout.paidAt), amount: sql<number>`sum(${payout.amount})` })
          .from(payout)
          .where(and(eq(payout.status, 'paid'), gte(payout.paidAt, since84)))
          .groupBy(istWeek(payout.paidAt))
          .orderBy(asc(istWeek(payout.paidAt))),
        db
          .select({ id: submission.id, submittedAt: submission.submittedAt, title: gig.title, worker: workerProfile.fullName })
          .from(submission)
          .innerJoin(gig, eq(gig.id, submission.gigId))
          .innerJoin(workerProfile, eq(workerProfile.userId, submission.workerId))
          .where(inArray(submission.status, ['submitted', 'resubmitted']))
          .orderBy(asc(submission.submittedAt))
          .limit(5),
        db
          .select({
            unpaid: sql<number>`coalesce(sum(case when ${referralReward.status} = 'approved' and ${referralReward.payoutId} is null then ${referralReward.amount} end), 0)`,
            pendingReview: sql<number>`sum(case when ${referralReward.status} = 'pending_review' then 1 else 0 end)`,
          })
          .from(referralReward),
      ])

    const submittedBy = new Map(submittedSeries.map((r) => [r.day, r.n]))
    const decidedBy = new Map(decidedSeries.map((r) => [r.day, r]))
    const daily = lastNDays(30).map((day) => ({
      day,
      submitted: submittedBy.get(day) ?? 0,
      approved: Number(decidedBy.get(day)?.approved ?? 0),
      rejected: Number(decidedBy.get(day)?.rejected ?? 0),
    }))
    const approved30 = Number(subs?.approved30 ?? 0)
    const rejected30 = Number(subs?.rejected30 ?? 0)

    return {
      kpis: {
        pendingApplicants: Number(workers?.pending ?? 0),
        approvedWorkers: Number(workers?.approved ?? 0),
        activeWorkers7d: Number(workers?.active7d ?? 0),
        needsReview: Number(subs?.needsReview ?? 0),
        liveCheckDue: Number(subs?.liveCheckDue ?? 0),
        inProgress: Number(subs?.inProgress ?? 0),
        expiringSoon: Number(subs?.expiringSoon ?? 0),
        liveGigs: Number(gigs?.live ?? 0),
        openSlots: Number(gigs?.openSlots ?? 0),
        unpaid: Number(subs?.unpaid ?? 0) + Number(rewards?.unpaid ?? 0),
        inPayout: Number(money?.inPayout ?? 0),
        paid30: Number(money?.paid30 ?? 0),
        paidAll: Number(money?.paidAll ?? 0),
        rewardsPendingReview: Number(rewards?.pendingReview ?? 0),
        approvalRate30: approved30 + rejected30 === 0 ? null : approved30 / (approved30 + rejected30),
      },
      daily,
      weeklyPayouts: payoutSeries.map((p) => ({ week: p.week, amount: Number(p.amount) })),
      oldestPending: oldest,
    }
  })

export const getWorkerOverview = createServerFn({ method: 'GET' })
  .middleware([workerMiddleware])
  .handler(async ({ context }) => {
    const { db, user, profile } = context
    const since56 = new Date(Date.now() - 56 * 86_400_000)
    const [active, weekly, [counts], newGigs] = await Promise.all([
      db
        .select({
          id: submission.id,
          status: submission.status,
          dueAt: submission.dueAt,
          submittedAt: submission.submittedAt,
          liveCheckAt: submission.liveCheckAt,
          payoutAmount: submission.payoutAmount,
          title: gig.title,
          platform: gig.platform,
        })
        .from(submission)
        .innerJoin(gig, eq(gig.id, submission.gigId))
        .where(and(eq(submission.workerId, user.id), inArray(submission.status, ['claimed', 'changes_requested', 'submitted', 'resubmitted', 'live_check', 'on_hold', 'in_review'])))
        .orderBy(asc(submission.dueAt))
        .limit(20),
      db
        .select({ week: istWeek(submission.decidedAt), amount: sql<number>`sum(${submission.payoutAmount})` })
        .from(submission)
        .where(and(eq(submission.workerId, user.id), eq(submission.status, 'approved'), gte(submission.decidedAt, since56)))
        .groupBy(istWeek(submission.decidedAt))
        .orderBy(asc(istWeek(submission.decidedAt))),
      db
        .select({
          approved: sql<number>`sum(case when ${submission.status} = 'approved' then 1 else 0 end)`,
          rejected: sql<number>`sum(case when ${submission.status} = 'rejected' then 1 else 0 end)`,
          total: count(),
        })
        .from(submission)
        .where(eq(submission.workerId, user.id)),
      db
        .select({ n: count() })
        .from(gig)
        .where(
          and(
            eq(gig.status, 'live'),
            sql`${gig.claimedSlots} < ${gig.totalSlots}`,
            sql`${gig.id} not in (select ${submission.gigId} from ${submission} where ${submission.workerId} = ${user.id})`,
          ),
        ),
    ])
    const approved = Number(counts?.approved ?? 0)
    const rejected = Number(counts?.rejected ?? 0)
    return {
      name: profile.fullName,
      active,
      weekly: weekly.map((w) => ({ week: w.week, amount: Number(w.amount) })),
      approved,
      rejected,
      totalTasks: counts?.total ?? 0,
      approvalRate: approved + rejected === 0 ? null : approved / (approved + rejected),
      openGigs: newGigs[0]?.n ?? 0,
    }
  })
