import type { SubmissionStatus } from '@/db/schema/enums'

export type ReviewDecision = 'approve' | 'request_changes' | 'reject'

export const REVIEWABLE: SubmissionStatus[] = ['submitted', 'resubmitted', 'live_check']
export const NEEDS_REVIEW: SubmissionStatus[] = ['submitted', 'resubmitted']
export const ACTIVE_FOR_WORKER: SubmissionStatus[] = ['claimed', 'changes_requested']
/** Statuses that hold a gig slot. Anything else frees it. */
export const HOLDS_SLOT: SubmissionStatus[] = [
  'claimed',
  'submitted',
  'changes_requested',
  'resubmitted',
  'live_check',
  'approved',
]
/** Unfinished assignments — the account is "in use" while one of these is open. */
export const OPEN_ASSIGNMENT: SubmissionStatus[] = ['claimed', 'submitted', 'changes_requested', 'resubmitted', 'live_check']
export const FINAL: SubmissionStatus[] = ['approved', 'rejected', 'expired', 'withdrawn']

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  claimed: 'In progress',
  submitted: 'Submitted',
  changes_requested: 'Changes requested',
  resubmitted: 'Resubmitted',
  live_check: 'Live check',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
}

type Transition = { ok: true; status: SubmissionStatus; liveCheckAt?: Date | null; final: boolean } | { ok: false; error: string }

/**
 * Admin review transitions. A first approval on a gig with a live-hold moves
 * the work into `live_check`; approving from `live_check` is the final OK.
 */
export function reviewTransition(
  current: SubmissionStatus,
  decision: ReviewDecision,
  opts: { liveHoldHours: number; submittedAt: Date | null; skipLiveCheck?: boolean },
): Transition {
  if (!REVIEWABLE.includes(current) && !(decision === 'reject' && current === 'changes_requested')) {
    return {
      ok: false,
      error: `Can't ${decision.replace('_', ' ')} a submission that is ${STATUS_LABELS[current].toLowerCase()}.`,
    }
  }
  switch (decision) {
    case 'approve': {
      if (current !== 'live_check' && opts.liveHoldHours > 0 && !opts.skipLiveCheck) {
        const base = opts.submittedAt ?? new Date()
        return {
          ok: true,
          status: 'live_check',
          liveCheckAt: new Date(base.getTime() + opts.liveHoldHours * 3_600_000),
          final: false,
        }
      }
      return { ok: true, status: 'approved', final: true }
    }
    case 'request_changes':
      if (current === 'changes_requested') return { ok: false, error: 'Changes were already requested.' }
      return { ok: true, status: 'changes_requested', liveCheckAt: null, final: false }
    case 'reject':
      return { ok: true, status: 'rejected', final: true }
  }
}

/** Worker-side transitions. */
export function workerSubmitTransition(current: SubmissionStatus): Transition {
  if (current === 'claimed') return { ok: true, status: 'submitted', final: false }
  if (current === 'changes_requested') return { ok: true, status: 'resubmitted', final: false }
  return { ok: false, error: 'This task is not waiting for a submission.' }
}

export function canWithdraw(current: SubmissionStatus) {
  return current === 'claimed' || current === 'changes_requested'
}
