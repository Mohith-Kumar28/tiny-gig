import { eq, sql } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { submission, submissionEvent, gig, workerProfile } from '@/db/schema'
import type { SubmissionStatus } from '@/db/schema/enums'
import { queueEmail } from '@/emails/send-email'
import { audit, notify } from '@/lib/server/activity'
import { refreshWorkerStats } from '@/features/workers/server/stats'
import { syncReferee } from '@/features/referrals/server/engine'
import { HOLDS_SLOT, type ReviewDecision, reviewTransition } from '../state'


export type DecisionInput = {
  decision: ReviewDecision
  comment?: string
  checklist?: string[]
  skipLiveCheck?: boolean
}

export type DecisionResult = { id: string; ok: boolean; status?: SubmissionStatus; error?: string }

/** Frees a gig slot when a submission leaves a slot-holding status. */
export function releaseSlotIfNeeded(db: Db, gigId: string, from: SubmissionStatus, to: SubmissionStatus) {
  if (HOLDS_SLOT.includes(from) && !HOLDS_SLOT.includes(to)) {
    return db
      .update(gig)
      .set({ claimedSlots: sql`max(0, ${gig.claimedSlots} - 1)` })
      .where(eq(gig.id, gigId))
  }
  return null
}

/** Applies one admin decision, with timeline, notifications, emails and stats. */
export async function decideOne(db: Db, adminId: string, id: string, input: DecisionInput): Promise<DecisionResult> {
  const row = await db
    .select({ sub: submission, gig, worker: workerProfile })
    .from(submission)
    .innerJoin(gig, eq(gig.id, submission.gigId))
    .innerJoin(workerProfile, eq(workerProfile.userId, submission.workerId))
    .where(eq(submission.id, id))
    .get()
  if (!row) return { id, ok: false, error: 'Not found' }
  const { sub, gig: g, worker } = row

  if ((input.decision === 'request_changes' || input.decision === 'reject') && !input.comment?.trim()) {
    return { id, ok: false, error: 'A comment is required.' }
  }
  const t = reviewTransition(sub.status, input.decision, {
    liveHoldHours: g.liveHoldHours,
    submittedAt: sub.submittedAt,
    skipLiveCheck: input.skipLiveCheck,
  })
  if (!t.ok) return { id, ok: false, error: t.error }

  const now = new Date()
  const patch: Partial<typeof submission.$inferInsert> = { status: t.status }
  if (t.liveCheckAt !== undefined) patch.liveCheckAt = t.liveCheckAt
  if (t.final) {
    patch.decidedAt = now
    patch.decidedBy = adminId
  }
  if (t.status === 'changes_requested') {
    patch.dueAt = new Date(now.getTime() + g.claimWindowHours * 3_600_000)
    patch.reminderSentAt = null
  }

  const action =
    t.status === 'live_check'
      ? ('moved_to_live_check' as const)
      : t.status === 'approved'
        ? ('approved' as const)
        : t.status === 'rejected'
          ? ('rejected' as const)
          : ('changes_requested' as const)

  const updateSub = db.update(submission).set(patch).where(eq(submission.id, id))
  const addEvent = db.insert(submissionEvent).values({
    submissionId: id,
    actorId: adminId,
    actorRole: 'admin',
    action,
    comment: input.comment?.trim() || null,
    checklist: input.checklist?.length ? input.checklist : null,
  })
  const release = releaseSlotIfNeeded(db, g.id, sub.status, t.status)
  if (release) await db.batch([updateSub, addEvent, release])
  else await db.batch([updateSub, addEvent])

  const href = `/w/work/${id}`
  switch (t.status) {
    case 'live_check':
      await notify(db, [{ userId: sub.workerId, title: `Passed review: ${g.title}`, body: `Keep it live for ${g.liveHoldHours}h`, href }])
      queueEmail({ to: worker.email, template: 'movedToLiveCheck', data: { title: g.title, hours: g.liveHoldHours, submissionId: id } })
      break
    case 'approved':
      await notify(db, [{ userId: sub.workerId, title: `Approved: ${g.title}`, body: 'Payment added to your balance', href }])
      queueEmail({ to: worker.email, template: 'submissionApproved', data: { title: g.title, payout: sub.payoutAmount } })
      break
    case 'changes_requested':
      await notify(db, [{ userId: sub.workerId, title: `Changes requested: ${g.title}`, body: input.comment, href }])
      queueEmail({
        to: worker.email,
        template: 'changesRequested',
        data: { title: g.title, comment: input.comment ?? '', submissionId: id, checklist: input.checklist },
      })
      break
    case 'rejected':
      await notify(db, [{ userId: sub.workerId, title: `Not approved: ${g.title}`, body: input.comment, href }])
      queueEmail({ to: worker.email, template: 'submissionRejected', data: { title: g.title, reason: input.comment ?? '', submissionId: id } })
      break
  }

  if (t.final) {
    await refreshWorkerStats(db, sub.workerId)
    if (t.status === 'approved') await syncReferee(db, sub.workerId)
  }
  await audit(db, { actorId: adminId, action: `submission.${action}`, entityType: 'submission', entityId: id })
  return { id, ok: true, status: t.status }
}
