import { Image } from 'lucide-react'
import { Money } from '@/components/shared/money'
import { PlatformIcon } from '@/components/shared/platform-icon'
import { RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { VerifyIcon } from '@/features/reddit/components/verify-badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { listReviewQueue } from '../server/admin-review'

export type QueueRow = Awaited<ReturnType<typeof listReviewQueue>>['rows'][number]

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
  return (
    <li
      data-active={active || undefined}
      className={cn(
        'group relative flex gap-3 border-b px-3 py-3 transition-colors last:border-b-0',
        active ? 'bg-primary/[0.06]' : 'hover:bg-accent/50',
      )}
    >
      {active ? <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-primary" /> : null}
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheck(!!v)}
        aria-label={`Select ${row.gigTitle} by ${row.workerName}`}
        className="mt-0.5"
      />
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={row.platform} className="size-3.5" />
          <span className="truncate text-sm font-medium">{row.workerName}</span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            <RelativeTime date={when} />
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{row.gigTitle}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <StatusBadge status={row.status} />
          <VerifyIcon state={row.verifyState} />
          {row.revision > 1 ? <span className="text-[11px] text-muted-foreground">v{row.revision}</span> : null}
          {row.screenshotCount ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Image className="size-3" />
              {row.screenshotCount}
            </span>
          ) : null}
          <Money paise={row.payoutAmount} className="ml-auto text-xs text-muted-foreground" />
        </div>
      </button>
    </li>
  )
}
