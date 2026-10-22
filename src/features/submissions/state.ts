import type { SubmissionStatus } from '@/db/schema/enums'

export type ReviewDecision = 'approve' | 'request_changes' | 'reject'

/**
 * Two flows live side by side:
 *  - legacy (instant claim): claimed → submitted → [review] → live_check → approved
 *  - two-step proof (§7, every assignment made by selection):
 *      claimed (selected) → on_hold (link, 24h live) → in_review (insights uploaded) → approved
 * Work keeps the flow it started in, so in-flight claims finish under the old rules.
 */
export const REVIEWABLE: SubmissionStatus[] = ['submitted', 'resubmitted', 'live_check', 'on_hold', 'in_review']
/** Waiting on a reviewer right now. */
export const NEEDS_REVIEW: SubmissionStatus[] = ['submitted', 'resubmitted', 'in_review']
export const ACTIVE_FOR_WORKER: SubmissionStatus[] = ['claimed', 'changes_requested']
/** Statuses that hold a gig slot. Anything else frees it. */
export const HOLDS_SLOT: SubmissionStatus[] = [
  'claimed',
  'submitted',
  'changes_requested',
  'resubmitted',
  'live_check',
  'on_hold',
  'in_review',
  'approved',
]
/** Unfinished assignments — the account is "in use" while one of these is open. */
export const OPEN_ASSIGNMENT: SubmissionStatus[] = ['claimed', 'submitted', 'changes_requested', 'resubmitted', 'live_check', 'on_hold', 'in_review']
export const FINAL: SubmissionStatus[] = ['approved', 'rejected', 'expired', 'withdrawn']

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  claimed: 'In progress',
  submitted: 'Submitted',
  changes_requested: 'Changes requested',
  resubmitted: 'Resubmitted',
  live_check: 'Live check',
  on_hold: 'On hold',
  in_review: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
}

type Transition = { ok: true; status: SubmissionStatus; liveCheckAt?: Date | null; final: boolean } | { ok: false; error: string }

const cannot = (decision: ReviewDecision, current: SubmissionStatus): Transition => ({
  ok: false,
  error: `Can't ${decision.replace('_', ' ')} a submission that is ${STATUS_LABELS[current].toLowerCase()}.`,
})

/**
 * Admin review transitions. Legacy: a first approval on a gig with a live hold moves the work
 * into `live_check`; approving from there is final. Two-step: only `in_review` (insights in)
 * can be approved; changes and rejection are possible during the hold too.
 */
export function reviewTransition(
  current: SubmissionStatus,
  decision: ReviewDecision,
  opts: { liveHoldHours: number; submittedAt: Date | null; skipLiveCheck?: boolean },
): Transition {
  if (!REVIEWABLE.includes(current) && !(decision === 'reject' && current === 'changes_requested')) return cannot(decision, current)
  switch (decision) {
    case 'approve': {
      if (current === 'on_hold') return { ok: false, error: 'Waiting for the insights screenshot after the live hold.' }
      if (current === 'in_review' || current === 'live_check') return { ok: true, status: 'approved', final: true }
      if (opts.liveHoldHours > 0 && !opts.skipLiveCheck) {
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

/**
 * Worker submits (or resubmits) the link. Two-step work goes on hold for the live period (R31);
 * a gig with no hold goes straight to review.
 */
export function workerSubmitTransition(current: SubmissionStatus, opts: { twoStep: boolean; liveHoldHours: number; now?: Date } = { twoStep: false, liveHoldHours: 0 }): Transition {
  if (current !== 'claimed' && current !== 'changes_requested') return { ok: false, error: 'This task is not waiting for a submission.' }
  if (opts.twoStep) {
    const now = opts.now ?? new Date()
    if (opts.liveHoldHours <= 0) return { ok: true, status: 'in_review', liveCheckAt: null, final: false }
    return { ok: true, status: 'on_hold', liveCheckAt: new Date(now.getTime() + opts.liveHoldHours * 3_600_000), final: false }
  }
  return { ok: true, status: current === 'claimed' ? 'submitted' : 'resubmitted', final: false }
}

/** Step two (R32): the insights screenshot, once the post has been live for the hold. */
export function insightsTransition(current: SubmissionStatus, liveCheckAt: Date | null, now = new Date()): Transition {
  if (current !== 'on_hold') return { ok: false, error: 'This task is not waiting for insights.' }
  if (liveCheckAt && liveCheckAt > now) return { ok: false, error: 'Upload the insights once the post has been live for the full hold.' }
  return { ok: true, status: 'in_review', final: false }
}

/** Assignments made by selection use the two-step proof. */
export function isTwoStep(sub: { selectedAt: Date | null }) {
  return sub.selectedAt != null
}

export function canWithdraw(current: SubmissionStatus) {
  return current === 'claimed' || current === 'changes_requested'
}
