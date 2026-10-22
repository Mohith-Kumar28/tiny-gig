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

/**
 * Progress as a ruled strip, like the columns of a ledger row: each step is a heavy rule with its
 * number and name under it. Done steps are inked in, the current one is ink-blue, the rest stay faint.
 */
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
  const allDone = steps.every((s) => s.state === 'done')
  return (
    <ol
      className={cn('grid w-full gap-1.5', className)}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      aria-label="Task progress"
    >
      {steps.map((s, i) => (
        <li
          key={s.key}
          className={cn('min-w-0', stopped && s.state === 'upcoming' && 'opacity-45')}
          aria-current={s.state === 'current' || s.state === 'warning' ? 'step' : undefined}
        >
          <span
            aria-hidden
            className={cn(
              'block h-[3px] rounded-[1px] transition-colors duration-200',
              s.state === 'done' && (allDone ? 'bg-success' : 'bg-foreground/70'),
              s.state === 'current' && 'bg-ink',
              s.state === 'warning' && 'bg-warning',
              s.state === 'failed' && 'bg-destructive',
              s.state === 'upcoming' && 'bg-border',
            )}
          />
          <span className="mt-1.5 flex flex-col items-start gap-0.5">
            <span className="flex h-4 items-center">
              {s.state === 'done' ? (
                <Check
                  className={cn('size-3 shrink-0', allDone ? 'text-success' : 'text-foreground/70')}
                  strokeWidth={3}
                  aria-hidden
                />
              ) : s.state === 'failed' ? (
                <X className="size-3 shrink-0 text-destructive" strokeWidth={3} aria-hidden />
              ) : s.state === 'warning' ? (
                <AlertTriangle className="size-3 shrink-0 text-warning-foreground dark:text-warning" aria-hidden />
              ) : (
                <span
                  className={cn(
                    'font-display text-[11px] leading-tight font-bold tabular sm:text-xs',
                    s.state === 'current' ? 'text-ink' : 'text-muted-foreground',
                  )}
                >
                  {i + 1}
                </span>
              )}
            </span>
            <span className="sr-only">{s.state === 'done' ? 'Done: ' : s.state === 'upcoming' ? 'Next: ' : 'Now: '}</span>
            <span
              className={cn(
                'min-w-0 text-[11px] leading-tight text-pretty sm:text-xs',
                s.state === 'upcoming' && 'text-muted-foreground',
                s.state === 'done' && 'text-foreground/80',
                s.state === 'current' && 'font-semibold text-ink',
                s.state === 'warning' && 'font-semibold text-warning-foreground dark:text-warning',
                s.state === 'failed' && 'font-semibold text-destructive',
              )}
            >
              {s.label}
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}
