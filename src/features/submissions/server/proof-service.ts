import { and, eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { gig, socialAccount, submission, submissionEvent, workerProfile } from '@/db/schema'
import { AppError } from '@/lib/server/middleware'
import { insightsTransition, isTwoStep, workerSubmitTransition } from '../state'

type Actor = { id: string; role: 'worker' | 'admin' }

const HOSTS: Record<string, RegExp> = {
  reddit: /(^|\.)reddit\.com$|(^|\.)redd\.it$/,
  x: /(^|\.)(x|twitter)\.com$/,
  linkedin: /(^|\.)linkedin\.com$/,
  threads: /(^|\.)threads\.(net|com)$/,
  instagram: /(^|\.)instagram\.com$/,
}

/** Proof must come from the selected account (R52). Staff check by hand; we only flag the obvious. */
export function proofWarning(platform: string, url: string): string | null {
  const re = HOSTS[platform]
  if (!re) return null
  try {
    return re.test(new URL(url).hostname) ? null : `This doesn’t look like a ${platform} link. Make sure it points to your post.`
  } catch {
    return 'That link doesn’t look right.'
  }
}

async function load(db: Db, submissionId: string, workerId?: string) {
  const row = await db
    .select({ sub: submission, gig })
    .from(submission)
    .innerJoin(gig, eq(gig.id, submission.gigId))
    .where(workerId ? and(eq(submission.id, submissionId), eq(submission.workerId, workerId)) : eq(submission.id, submissionId))
    .get()
  if (!row) throw new AppError('NOT_FOUND', 'Task not found.')
  return row
}

/**
 * Step one: the link (R31). Two-step work goes on hold for the live period; legacy work goes to review.
 * Used by the worker and by staff acting on their behalf (R39) — the actor is recorded either way.
 */
export async function applyProof(
  db: Db,
  args: { submissionId: string; workerId?: string; actor: Actor; proofUrl: string; screenshotKeys: string[]; note?: string | null },
) {
  const { sub, gig: g } = await load(db, args.submissionId, args.workerId)
  const now = new Date()
  const t = workerSubmitTransition(sub.status, { twoStep: isTwoStep(sub), liveHoldHours: g.liveHoldHours, now })
  if (!t.ok) throw new AppError('CONFLICT', t.error)
  if (args.actor.role === 'worker' && sub.dueAt < now) throw new AppError('CONFLICT', 'The deadline for this task has passed.')
  const ownKeys = args.screenshotKeys.filter((k) => k.startsWith(`proofs/${sub.workerId}/`) || args.actor.role === 'admin')
  const onBehalf = args.actor.role === 'admin'
  await db.batch([
    db
      .update(submission)
      .set({
        status: t.status,
        proofUrl: args.proofUrl,
        screenshotKeys: ownKeys,
        workerNote: args.note || null,
        submittedAt: now,
        // The post exists on the platform from this moment on — cooldowns count from here (R18).
        firstSubmittedAt: sub.firstSubmittedAt ?? now,
        liveCheckAt: t.liveCheckAt ?? (t.status === 'on_hold' ? null : sub.liveCheckAt),
        revision: sub.revision + 1,
        insightsRemindedAt: null,
        ...(onBehalf ? { onBehalfBy: args.actor.id } : {}),
      })
      .where(eq(submission.id, sub.id)),
    db.insert(submissionEvent).values({
      submissionId: sub.id,
      actorId: args.actor.id,
      actorRole: args.actor.role,
      action: sub.status === 'changes_requested' ? 'resubmitted' : 'submitted',
      comment: onBehalf ? `Link added on the worker’s behalf${args.note ? `: ${args.note}` : ''}` : args.note || null,
    }),
    db.update(workerProfile).set({ lastActiveAt: now }).where(eq(workerProfile.userId, sub.workerId)),
  ])
  return { status: t.status, liveCheckAt: t.liveCheckAt ?? null, warning: proofWarning(g.platform, args.proofUrl), gig: g, sub }
}

/**
 * Step two: the insights screenshot after the hold (R32). Optionally refreshes the account's karma —
 * the worker is already looking at their profile, the cheapest moment to ask (§14.3).
 */
export async function applyInsights(
  db: Db,
  args: { submissionId: string; workerId?: string; actor: Actor; insightsKeys: string[]; karma?: number | null; note?: string | null },
) {
  const { sub, gig: g } = await load(db, args.submissionId, args.workerId)
  const now = new Date()
  const t = insightsTransition(sub.status, sub.liveCheckAt, now)
  if (!t.ok) throw new AppError('CONFLICT', t.error)
  const keys = args.insightsKeys.filter((k) => k.startsWith(`proofs/${sub.workerId}/`) || args.actor.role === 'admin')
  if (!keys.length) throw new AppError('BAD_REQUEST', 'Add a screenshot of the post’s insights.')
  const onBehalf = args.actor.role === 'admin'
  const updateSub = db
    .update(submission)
    .set({ status: t.status, insightsKeys: keys, insightsSubmittedAt: now, ...(onBehalf ? { onBehalfBy: args.actor.id } : {}) })
    .where(eq(submission.id, sub.id))
  const addEvent = db.insert(submissionEvent).values({
    submissionId: sub.id,
    actorId: args.actor.id,
    actorRole: args.actor.role,
    action: 'insights_submitted',
    comment: onBehalf ? `Insights added on the worker’s behalf${args.note ? `: ${args.note}` : ''}` : args.note || null,
  })
  if (args.karma != null && sub.accountId) {
    await db.batch([
      updateSub,
      addEvent,
      db.update(socialAccount).set({ karma: args.karma, karmaUpdatedAt: now }).where(eq(socialAccount.id, sub.accountId)),
    ])
  } else {
    await db.batch([updateSub, addEvent])
  }
  return { status: t.status, gig: g, sub }
}
