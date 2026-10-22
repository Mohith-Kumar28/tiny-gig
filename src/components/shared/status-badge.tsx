import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'primary' | 'muted'

const TONES: Record<Tone, string> = {
  neutral: 'bg-secondary text-secondary-foreground ring-border',
  muted: 'bg-muted text-muted-foreground ring-border',
  info: 'bg-info/12 text-info ring-info/25',
  warning: 'bg-warning/18 text-warning-foreground dark:text-warning ring-warning/35',
  success: 'bg-success/12 text-success ring-success/25',
  danger: 'bg-destructive/10 text-destructive ring-destructive/25',
  primary: 'bg-primary/12 text-primary ring-primary/25',
}

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  // submissions
  claimed: { label: 'In progress', tone: 'info' },
  submitted: { label: 'Submitted', tone: 'primary' },
  resubmitted: { label: 'Resubmitted', tone: 'primary' },
  changes_requested: { label: 'Changes requested', tone: 'warning' },
  live_check: { label: 'Live check', tone: 'info' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  expired: { label: 'Expired', tone: 'muted' },
  withdrawn: { label: 'Withdrawn', tone: 'muted' },
  // workers
  draft: { label: 'Draft', tone: 'muted' },
  pending: { label: 'Pending', tone: 'warning' },
  suspended: { label: 'Suspended', tone: 'danger' },
  // gigs
  live: { label: 'Live', tone: 'success' },
  paused: { label: 'Paused', tone: 'warning' },
  closed: { label: 'Closed', tone: 'muted' },
  // payouts
  processing: { label: 'Processing', tone: 'info' },
  paid: { label: 'Paid', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  // rewards
  pending_review: { label: 'Needs review', tone: 'warning' },
  void: { label: 'Void', tone: 'muted' },
  // accounts
  active: { label: 'Active', tone: 'success' },
  warned: { label: 'Warned', tone: 'warning' },
  banned: { label: 'Banned', tone: 'danger' },
  lost: { label: 'Lost', tone: 'danger' },
  retired: { label: 'Retired', tone: 'muted' },
  cooling_down: { label: 'Cooling down', tone: 'info' },
  // email
  sent: { label: 'Sent', tone: 'success' },
  logged: { label: 'Logged (dev)', tone: 'muted' },
}

export function statusLabel(status: string) {
  return STATUS_MAP[status]?.label ?? status.replace(/_/g, ' ')
}

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const s = STATUS_MAP[status] ?? { label: status, tone: 'neutral' as Tone }
  return (
    <span
      className={cn(
        'inline-flex h-5.5 shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        TONES[s.tone],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-80" />
      {label ?? s.label}
    </span>
  )
}
