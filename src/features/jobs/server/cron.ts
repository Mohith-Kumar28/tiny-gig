import { and, eq, gt, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { appSetting, gig, socialAccount, submission, submissionEvent, workerProfile } from '@/db/schema'
import { sendEmail } from '@/emails/send-email'
import { levelFor } from '@/features/accounts/rules'
import { lockBalancesIntoPayouts } from '@/features/payouts/server/payout-service'
import { formatMoney } from '@/lib/format'
import { evaluateAllReferrers } from '@/features/referrals/server/engine'
import { alertRecipients, loadSettings } from '@/features/settings/server/settings-store'
import { releaseSlotIfNeeded } from '@/features/submissions/server/review-service'
import { notify, notifyAdmins } from '@/lib/server/activity'


const fmt = (d: Date) => d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })

/** Runs every 15 minutes from the Worker `scheduled` handler. */
export async function runCronJobs(now: Date) {
  const db = getDb()
  const settings = await loadSettings(db)
  const jobs: [string, () => Promise<unknown>][] = [
    ['expire-claims', () => expireClaims(db, now)],
    ['claim-reminders', () => sendReminders(db, now, settings.reminderHoursBefore)],
    ['auto-close-gigs', () => closeEndedGigs(db, now)],
    ['insights-reminders', () => sendInsightsReminders(db, now)],
    ['level-ups', () => notifyLevelUps(db, now, settings.levelRates.post)],
    ['weekly-payouts', () => (settings.weeklyPayouts ? weeklyPayoutRun(db, now) : Promise.resolve())],
    ['admin-digest', () => (settings.dailyDigest ? sendDailyDigest(db, now) : Promise.resolve())],
    ['referrals', () => (now.getUTCMinutes() < 15 ? evaluateAllReferrers(db) : Promise.resolve())],
  ]
  for (const [name, job] of jobs) {
    try {
      await job()
    } catch (err) {
      console.error(`[cron:${name}]`, err)
    }
  }
}

type Db = ReturnType<typeof getDb>

async function expireClaims(db: Db, now: Date) {
  const overdue = await db
    .select({ sub: submission, title: gig.title, email: workerProfile.email })
    .from(submission)
    .innerJoin(gig, eq(gig.id, submission.gigId))
    .innerJoin(workerProfile, eq(workerProfile.userId, submission.workerId))
    .where(and(inArray(submission.status, ['claimed', 'changes_requested']), lte(submission.dueAt, now)))
    .limit(200)

  for (const { sub, title, email } of overdue) {
    const update = db.update(submission).set({ status: 'expired', decidedAt: now }).where(eq(submission.id, sub.id))
    const event = db
      .insert(submissionEvent)
      .values({ submissionId: sub.id, actorRole: 'system', action: 'expired', comment: 'Deadline passed' })
    const release = releaseSlotIfNeeded(db, sub.gigId, sub.status, 'expired')
    if (release) await db.batch([update, event, release])
    else await db.batch([update, event])
    await notify(db, [{ userId: sub.workerId, title: `Expired: ${title}`, body: 'The deadline passed without a submission.', href: `/w/work/${sub.id}` }])
    await sendEmail({ to: email, template: 'claimExpired', data: { title } })
  }
}

async function sendReminders(db: Db, now: Date, hoursBefore: number) {
  if (hoursBefore <= 0) return
  const horizon = new Date(now.getTime() + hoursBefore * 3_600_000)
  const due = await db
    .select({ sub: submission, title: gig.title, email: workerProfile.email, prefs: workerProfile.emailPrefs })
    .from(submission)
    .innerJoin(gig, eq(gig.id, submission.gigId))
    .innerJoin(workerProfile, eq(workerProfile.userId, submission.workerId))
    .where(
      and(
        inArray(submission.status, ['claimed', 'changes_requested']),
        isNull(submission.reminderSentAt),
        gt(submission.dueAt, now),
        lte(submission.dueAt, horizon),
      ),
    )
    .limit(200)

  for (const { sub, title, email, prefs } of due) {
    await db.update(submission).set({ reminderSentAt: now }).where(eq(submission.id, sub.id))
    await notify(db, [{ userId: sub.workerId, title: `Due soon: ${title}`, body: `Submit before ${fmt(sub.dueAt)}`, href: `/w/work/${sub.id}` }])
    if (prefs.reminders) {
      await sendEmail({ to: email, template: 'claimExpiring', data: { title, dueAt: fmt(sub.dueAt), submissionId: sub.id } })
    }
  }
}

async function closeEndedGigs(db: Db, now: Date) {
  await db
    .update(gig)
    .set({ status: 'closed' })
    .where(and(eq(gig.status, 'live'), lte(gig.endsAt, now)))
}

/** Once per IST day, after 9am. */
async function sendDailyDigest(db: Db, now: Date) {
  const ist = new Date(now.getTime() + 5.5 * 3_600_000)
  if (ist.getUTCHours() < 9) return
  const today = ist.toISOString().slice(0, 10)
  const key = 'digest:last'
  const last = await db.query.appSetting.findFirst({ where: eq(appSetting.key, key) })
  if (last?.value === today) return

  const [row] = await db
    .select({
      pendingReviews: sql<number>`sum(case when ${submission.status} in ('submitted','resubmitted','in_review') then 1 else 0 end)`,
      liveChecks: sql<number>`sum(case when ${submission.status} = 'live_check' and ${submission.liveCheckAt} <= ${now.getTime()} then 1 else 0 end)`,
    })
    .from(submission)
  const [apps] = await db
    .select({ n: sql<number>`count(*)` })
    .from(workerProfile)
    .where(eq(workerProfile.status, 'pending'))

  await db
    .insert(appSetting)
    .values({ key, value: today })
    .onConflictDoUpdate({ target: appSetting.key, set: { value: today } })

  const data = {
    pendingReviews: Number(row?.pendingReviews ?? 0),
    liveChecks: Number(row?.liveChecks ?? 0),
    applicants: Number(apps?.n ?? 0),
  }
  if (data.pendingReviews + data.liveChecks + data.applicants === 0) return
  await sendEmail({ to: await alertRecipients(db), template: 'adminDigest', data })
}

/** Once the live hold is over, remind the worker to upload insights (R36) — most missed steps are forgetting. */
async function sendInsightsReminders(db: Db, now: Date) {
  const due = await db
    .select({ sub: submission, title: gig.title, email: workerProfile.email, prefs: workerProfile.emailPrefs })
    .from(submission)
    .innerJoin(gig, eq(gig.id, submission.gigId))
    .innerJoin(workerProfile, eq(workerProfile.userId, submission.workerId))
    .where(and(eq(submission.status, 'on_hold'), lte(submission.liveCheckAt, now), isNull(submission.insightsRemindedAt)))
    .limit(200)
  for (const { sub, title, email, prefs } of due) {
    await db.update(submission).set({ insightsRemindedAt: now }).where(eq(submission.id, sub.id))
    await notify(db, [{ userId: sub.workerId, title: `Upload insights: ${title}`, body: 'Your post has been live for the full hold. One last step.', href: `/w/work/${sub.id}` }])
    if (prefs.reminders) await sendEmail({ to: email, template: 'insightsDue', data: { title, submissionId: sub.id } })
  }
}

/** IST day key, and whether this IST-day job already ran (dedupe via app_setting). */
async function oncePerIstDay(db: Db, now: Date, key: string, afterHour = 9) {
  const ist = new Date(now.getTime() + 5.5 * 3_600_000)
  if (ist.getUTCHours() < afterHour) return null
  const today = ist.toISOString().slice(0, 10)
  const last = await db.query.appSetting.findFirst({ where: eq(appSetting.key, key) })
  if (last?.value === today) return null
  await db.insert(appSetting).values({ key, value: today }).onConflictDoUpdate({ target: appSetting.key, set: { value: today } })
  return { today, ist }
}

/**
 * Age is recomputed every day (R25): accounts climb levels on their own. Tell the worker when one
 * of theirs crossed a boundary in the last day — a reason to keep accounts healthy.
 */
async function notifyLevelUps(db: Db, now: Date, postRates: Record<'L1' | 'L2' | 'L3' | 'L4', number>) {
  if (!(await oncePerIstDay(db, now, 'levelups:last'))) return
  const yesterday = new Date(now.getTime() - 86_400_000)
  const accounts = await db
    .select({ workerId: socialAccount.workerId, handle: socialAccount.handle, createdOn: socialAccount.createdOn })
    .from(socialAccount)
    .where(and(eq(socialAccount.platform, 'reddit'), eq(socialAccount.standing, 'active'), isNotNull(socialAccount.createdOn)))
  const items = accounts.flatMap((a) => {
    const before = levelFor(a.createdOn, yesterday)
    const after = levelFor(a.createdOn, now)
    if (!after || before === after || after === 'warmup') return []
    const title =
      before === 'warmup' ? `u/${a.handle} can now take paid gigs` : `u/${a.handle} reached ${after}`
    return [{ userId: a.workerId, title, body: `Posts from this account now pay ${formatMoney(postRates[after])}.`, href: '/w/accounts' }]
  })
  await notify(db, items)
}

/** Weekly payout run (§13, answer 9): Monday morning IST, no minimum. Staff still send UPI and record UTRs. */
async function weeklyPayoutRun(db: Db, now: Date) {
  const ist = new Date(now.getTime() + 5.5 * 3_600_000)
  if (ist.getUTCDay() !== 1) return
  if (!(await oncePerIstDay(db, now, 'payouts:weekly:last', 8))) return
  const r = await lockBalancesIntoPayouts(db, { actorId: null, note: `Weekly payout · ${ist.toISOString().slice(0, 10)}` })
  if (!r.created) return
  await notifyAdmins(db, {
    title: 'Weekly payouts are ready',
    body: `${r.created} payout${r.created === 1 ? '' : 's'} to send by UPI. Record each UTR when paid.`,
    href: '/admin/payouts',
  })
  await sendEmail({ to: await alertRecipients(db), template: 'adminWeeklyPayouts', data: r })
}
