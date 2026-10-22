import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Money } from '@/components/shared/money'
import { PLATFORM_LABELS, PlatformIcon } from '@/components/shared/platform-icon'
import { RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { listGigs } from '../server/admin-gigs'
import { GigRowActions } from './gig-actions'
import { formatHours, TASK_TYPE_LABELS } from './worker-gig-meta'

export type GigRow = Awaited<ReturnType<typeof listGigs>>['rows'][number]

export function SlotsBar({ claimed, total, className }: { claimed: number; total: number; className?: string }) {
  const pct = total ? Math.min(100, Math.round((claimed / total) * 100)) : 0
  return (
    <div className={cn('w-24 space-y-1', className)}>
      <div className="text-xs tabular">
        <span className="font-medium">{formatNumber(claimed)}</span>
        <span className="text-muted-foreground"> / {formatNumber(total)}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-[1px] bg-muted">
        <div className={cn('h-full', pct >= 100 ? 'bg-success' : 'bg-foreground/60')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export const gigColumns: ColumnDef<GigRow, unknown>[] = [
  {
    id: 'title',
    header: 'Gig',
    meta: { sortKey: 'title' },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <PlatformIcon platform={row.original.platform} />
        <div className="min-w-0">
          <div className="max-w-[30rem] truncate font-medium">{row.original.title}</div>
          <div className="truncate text-xs text-muted-foreground">
            {row.original.community || PLATFORM_LABELS[row.original.platform]} · {TASK_TYPE_LABELS[row.original.taskType]}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'status',
    header: () => 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: 'payout',
    header: 'Payout',
    meta: { sortKey: 'payout', label: 'Payout', className: 'text-right', headerClassName: 'text-right' },
    cell: ({ row }) =>
      row.original.payMode === 'levels' ? (
        <span className="whitespace-nowrap">
          <span className="text-xs text-muted-foreground">up to </span>
          <Money paise={row.original.payoutAmount} className="font-display font-bold" />
        </span>
      ) : (
        <Money paise={row.original.payoutAmount} className="font-display font-bold" />
      ),
  },
  {
    id: 'claimed',
    header: 'Slots',
    meta: { sortKey: 'claimed', label: 'Slots' },
    cell: ({ row }) => <SlotsBar claimed={row.original.claimedSlots} total={row.original.totalSlots} />,
  },
  {
    id: 'pending',
    header: 'To review',
    meta: { sortKey: 'pending', label: 'Pending reviews' },
    cell: ({ row }) =>
      row.original.pending ? (
        <Link
          to="/admin/review"
          search={{ gigId: row.original.id }}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-primary/40 bg-primary/7 px-2 text-xs font-semibold text-primary tabular transition-colors hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {formatNumber(row.original.pending)} to review
          <ArrowRight className="size-3" />
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'approved',
    header: () => 'Approved',
    meta: { label: 'Approved', className: 'tabular text-right', headerClassName: 'text-right' },
    cell: ({ row }) => formatNumber(row.original.approved),
  },
  {
    id: 'liveHold',
    header: () => 'Live hold',
    meta: { label: 'Live hold', className: 'text-muted-foreground' },
    cell: ({ row }) => (row.original.liveHoldHours ? formatHours(row.original.liveHoldHours) : 'None'),
  },
  {
    id: 'endsAt',
    header: 'Ends',
    meta: { sortKey: 'endsAt', label: 'Ends', className: 'pl-8', headerClassName: 'pl-8' },
    cell: ({ row }) => <RelativeTime date={row.original.endsAt} className="text-muted-foreground" />,
  },
  {
    id: 'createdAt',
    header: 'Created',
    meta: { sortKey: 'createdAt', label: 'Created' },
    cell: ({ row }) => <RelativeTime date={row.original.createdAt} className="text-muted-foreground" />,
  },
  {
    id: 'actions',
    enableHiding: false,
    header: () => <span className="sr-only">Actions</span>,
    meta: { className: 'w-10 text-right' },
    cell: ({ row }) => <GigRowActions gig={row.original} />,
  },
]
