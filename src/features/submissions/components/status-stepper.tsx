import { AlertTriangle, Check, X } from 'lucide-react'
import type { SubmissionStatus } from '@/db/schema/enums'
import { cn } from '@/lib/utils'

type StepState = 'done' | 'current' | 'upcoming' | 'warning' | 'failed'
type Step = { key: string; label: string; state: StepState }

const FAIL_LABELS: Partial<Record<SubmissionStatus, string>> = {
  rejected: 'Not approved',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
}

/** Two-step proof (R35): Selected → Posted → Live hold → Insights → Approved. */
function twoStepSteps(status: SubmissionStatus, opts: { hasSubmitted: boolean; holdOver: boolean }): Step[] {
  const base = [
    { key: 'selected', label: 'Selected' },
    { key: 'posted', label: 'Post & submit link' },
    { key: 'hold', label: 'Live hold' },
    { key: 'insights', label: 'Upload insights' },
    { key: 'approved', label: 'Approved' },
  ]
  let current = 1
  let state: StepState = 'current'
  let label: string | undefined
  switch (status) {
    case 'claimed':
      current = 1
      break
    case 'changes_requested':
      current = 1
      state = 'warning'
      label = 'Fix & resubmit'
      break
    case 'on_hold':
      current = opts.holdOver ? 3 : 2
      break
    case 'in_review':
      current = 4
      label = 'In review'
      break
    case 'approved':
      current = base.length
      break
    case 'rejected':
      current = 4
      state = 'failed'
      label = FAIL_LABELS.rejected
      break
    default:
      current = opts.hasSubmitted ? 2 : 1
      state = 'failed'
      label = FAIL_LABELS[status]
  }
  return base.map((s, i) => ({
    key: s.key,
    label: i === current && label ? label : s.label,
    state: i < current ? 'done' : i === current ? state : 'upcoming',
  }))
}

/** Legacy: Claimed → Submitted → In review → (Live check) → Approved. Two-step work uses twoStepSteps. */
export function buildSteps(
  status: SubmissionStatus,
  opts: { liveHold: boolean; hasSubmitted: boolean; twoStep?: boolean; holdOver?: boolean },
): Step[] {
  if (opts.twoStep) return twoStepSteps(status, { hasSubmitted: opts.hasSubmitted, holdOver: !!opts.holdOver })
  const base = [
    { key: 'claimed', label: 'Claimed' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'review', label: 'In review' },
    ...(opts.liveHold ? [{ key: 'live', label: 'Live check' }] : []),
    { key: 'approved', label: 'Approved' },
  ]
  const last = base.length - 1
  let current: number
  let currentState: StepState = 'current'
  let failLabel: string | undefined
  switch (status) {
    case 'claimed':
      current = 1
      break
    case 'changes_requested':
      current = 1
      currentState = 'warning'
      failLabel = 'Fix & resubmit'
      break
    case 'submitted':
    case 'resubmitted':
      current = 2
      break
    case 'live_check':
      current = opts.liveHold ? 3 : 2
      break
    case 'approved':
      current = base.length
      break
    case 'rejected':
      current = last
      currentState = 'failed'
      failLabel = FAIL_LABELS.rejected
      break
    default:
      current = opts.hasSubmitted ? 2 : 1
      currentState = 'failed'
      failLabel = FAIL_LABELS[status]
  }
  return base.map((s, i) => ({
    key: s.key,
    label: i === current && failLabel ? failLabel : s.label,
    state: i < current ? 'done' : i === current ? currentState : 'upcoming',
  }))
}

export function StatusStepper({
  status,
  liveHold,
  hasSubmitted = false,
  twoStep = false,
  holdOver = false,
  className,
}: {
  status: SubmissionStatus
  liveHold: boolean
  hasSubmitted?: boolean
  twoStep?: boolean
  holdOver?: boolean
  className?: string
}) {
  const steps = buildSteps(status, { liveHold, hasSubmitted, twoStep, holdOver })
  const stopped = steps.some((s) => s.state === 'failed')
  return (
    <ol className={cn('flex w-full items-start', className)} aria-label="Task progress">
      {steps.map((s, i) => (
        <li
          key={s.key}
          className="relative flex flex-1 flex-col items-center gap-1.5 text-center"
          aria-current={s.state === 'current' ? 'step' : undefined}
        >
          {i > 0 ? (
            <span
              aria-hidden
              className={cn(
                'absolute top-3.5 right-1/2 h-0.5 w-full -translate-y-1/2',
                s.state === 'upcoming' ? 'bg-border' : s.state === 'failed' ? 'bg-destructive/40' : 'bg-success',
              )}
            />
          ) : null}
          <span
            className={cn(
              'relative z-10 flex size-7 items-center justify-center rounded-full border-2 bg-background text-xs font-semibold tabular',
              s.state === 'done' && 'border-success bg-success text-success-foreground',
              s.state === 'current' && 'border-primary text-primary ring-4 ring-primary/15',
              s.state === 'warning' && 'border-warning bg-warning text-warning-foreground ring-4 ring-warning/20',
              s.state === 'failed' && 'border-destructive bg-destructive text-white',
              s.state === 'upcoming' && 'border-border text-muted-foreground',
              stopped && s.state === 'upcoming' && 'opacity-50',
            )}
          >
            {s.state === 'done' ? (
              <Check className="size-3.5" strokeWidth={3} />
            ) : s.state === 'failed' ? (
              <X className="size-3.5" strokeWidth={3} />
            ) : s.state === 'warning' ? (
              <AlertTriangle className="size-3.5" />
            ) : (
              i + 1
            )}
          </span>
          <span
            className={cn(
              'px-0.5 text-[11px] leading-tight font-medium sm:text-xs',
              s.state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground',
              s.state === 'failed' && 'text-destructive',
              s.state === 'warning' && 'text-warning-foreground dark:text-warning',
              stopped && s.state === 'upcoming' && 'opacity-50',
            )}
          >
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  )
}
