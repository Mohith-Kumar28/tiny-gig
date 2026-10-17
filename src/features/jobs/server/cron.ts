import { and, eq, gt, inArray, isNull, lte, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { submission, submissionEvent, gig, workerProfile, appSetting } from '@/db/schema'
import { sendEmail } from '@/emails/send-email'
import { evaluateAllReferrers } from '@/features/referrals/server/engine'
import { alertRecipients, loadSettings } from '@/features/settings/server/settings-store'
import { releaseSlotIfNeeded } from '@/features/submissions/server/review-service'
import { notify } from '@/lib/server/activity'


const fmt = (d: Date) => d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })

/** Runs every 15 minutes from the Worker `scheduled` handler. */
export async function runCronJobs(now: Date) {
  const db = getDb()
  const settings = await loadSettings(db)
  const jobs: [string, () => Promise<unknown>][] = [
    ['expire-claims', () => expireClaims(db, now)],
    ['claim-reminders', () => sendReminders(db, now, settings.reminderHoursBefore)],
    ['auto-close-gigs', () => closeEndedGigs(db, now)],
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
    await notify(db, [{ userId: sub.workerId, title: `Claim expired: ${title}`, href: `/w/work/${sub.id}` }])
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
      pendingReviews: sql<number>`sum(case when ${submission.status} in ('submitted','resubmitted') then 1 else 0 end)`,
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
