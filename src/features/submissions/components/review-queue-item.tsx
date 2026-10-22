import { Image } from 'lucide-react'
import { Money } from '@/components/shared/money'
import { PlatformIcon } from '@/components/shared/platform-icon'
import { RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TASK_TYPE_LABELS } from '@/features/gigs/components/worker-gig-meta'
import { cn } from '@/lib/utils'
import type { listReviewQueue } from '../server/admin-review'

export type QueueRow = Awaited<ReturnType<typeof listReviewQueue>>['rows'][number]

const DAY = 86_400_000

/** One ruled line of the inbox: who, where, what state, how long it has waited, how much it pays. */
export function ReviewQueueItem({
  row,
  active,
  checked,
  onSelect,
  onCheck,
}: {
  row: QueueRow
  active: boolean
  checked: boolean
  onSelect: () => void
  onCheck: (checked: boolean) => void
}) {
  const when = row.status === 'live_check' ? row.liveCheckAt : (row.submittedAt ?? row.updatedAt)
  const stale = when ? Date.now() - new Date(when).getTime() > 2 * DAY : false
  return (
    <li
      data-active={active || undefined}
      className={cn(
        'group relative flex gap-3 border-b py-2.5 pr-3 pl-3 transition-colors duration-150',
        active ? 'bg-ink/[0.07]' : 'hover:bg-accent/60',
      )}
    >
      {active ? <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-ink" /> : null}
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheck(!!v)}
        aria-label={`Select ${row.gigTitle} by ${row.workerName}`}
        className="mt-0.5"
      />
      <button
        type="button"
        onClick={onSelect}
        aria-current={active || undefined}
        className="min-w-0 flex-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-semibold">{row.workerName}</span>
          <Money paise={row.payoutAmount} className="ml-auto shrink-0 font-display text-sm font-bold" />
        </div>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <PlatformIcon platform={row.platform} className="size-3.5 shrink-0" />
          {row.community ? <span className="shrink-0 font-medium text-foreground/80">{row.community}</span> : null}
          <span className="shrink-0">
            {row.community ? '·' : ''} {TASK_TYPE_LABELS[row.taskType]}
          </span>
          <span className="truncate">· {row.gigTitle}</span>
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <StatusBadge status={row.status} />
          {row.revision > 1 ? <span className="text-[11px] text-muted-foreground tabular">v{row.revision}</span> : null}
          {row.screenshotCount ? (
            <span
              className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground tabular"
              title={`${row.screenshotCount} screenshots`}
            >
              <Image className="size-3" />
              {row.screenshotCount}
            </span>
          ) : null}
          <span className={cn('ml-auto shrink-0 text-xs', stale ? 'font-medium text-foreground' : 'text-muted-foreground')}>
            {row.status === 'live_check' ? 'Check ' : 'Sent '}
            <RelativeTime date={when} />
          </span>
        </div>
      </button>
    </li>
  )
}
