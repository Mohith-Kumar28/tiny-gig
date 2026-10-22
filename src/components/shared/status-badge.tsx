import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'primary' | 'muted'

/** Office-stamp tags. Settled states get the ledger's double rule as their border. */
const TONES: Record<Tone, string> = {
  neutral: 'bg-secondary text-secondary-foreground border-border',
  muted: 'bg-transparent text-muted-foreground border-border',
  info: 'bg-ink/6 text-ink border-ink/35',
  warning: 'bg-warning/15 text-warning-foreground border-warning/60 dark:text-warning',
  success: 'bg-success/8 text-success border-success/55 border-double border-[3px] px-1',
  danger: 'bg-destructive/7 text-destructive border-destructive/40',
  // Carbon stamp: with staff, nothing wrong. Red stays for real trouble.
  primary: 'bg-card text-foreground border-foreground/45',
}

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  // submissions
  claimed: { label: 'In progress', tone: 'info' },
  submitted: { label: 'Submitted', tone: 'primary' },
  resubmitted: { label: 'Resubmitted', tone: 'primary' },
  changes_requested: { label: 'Changes requested', tone: 'warning' },
  live_check: { label: 'Live check', tone: 'info' },
  on_hold: { label: 'On hold', tone: 'info' },
  in_review: { label: 'In review', tone: 'primary' },
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
        'inline-flex h-5.5 shrink-0 items-center rounded-[3px] border px-1.5 text-[0.7rem] leading-none font-semibold tracking-[0.04em] whitespace-nowrap uppercase [font-stretch:82%]',
        TONES[s.tone],
        className,
      )}
    >
      {label ?? s.label}
    </span>
  )
}
