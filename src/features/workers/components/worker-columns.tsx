import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import { Money } from '@/components/shared/money'
import { RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatNumber } from '@/lib/format'
import type { listWorkers } from '../server/admin-workers'

export type WorkerRow = Awaited<ReturnType<typeof listWorkers>>['rows'][number]

const name: ColumnDef<WorkerRow, unknown> = {
  id: 'name',
  header: 'Name',
  meta: { sortKey: 'name' },
  cell: ({ row }) => (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 truncate font-medium">
          {row.original.fullName}
          {row.original.flagReason ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="size-3.5 text-warning-foreground dark:text-warning" />
              </TooltipTrigger>
              <TooltipContent>{row.original.flagReason}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        <div className="truncate text-xs text-muted-foreground">u/{row.original.redditUsername}</div>
      </div>
    </div>
  ),
}

const karma: ColumnDef<WorkerRow, unknown> = {
  id: 'karma',
  header: 'Karma',
  meta: { sortKey: 'karma', label: 'Karma', className: 'tabular text-right', headerClassName: 'text-right' },
  cell: ({ row }) => formatNumber(row.original.karma),
}

const age: ColumnDef<WorkerRow, unknown> = {
  id: 'age',
  header: 'Age',
  meta: { sortKey: 'age', label: 'Account age', className: 'tabular text-right', headerClassName: 'text-right' },
  cell: ({ row }) => `${row.original.accountAgeMonths} mo`,
}

const state: ColumnDef<WorkerRow, unknown> = {
  id: 'state',
  header: 'State',
  meta: { sortKey: 'state', label: 'State', className: 'max-w-36 truncate' },
  cell: ({ row }) => row.original.state,
}

const status: ColumnDef<WorkerRow, unknown> = {
  id: 'status',
  header: () => 'Status',
  cell: ({ row }) => <StatusBadge status={row.original.status} />,
}

export const applicantColumns: ColumnDef<WorkerRow, unknown>[] = [
  name,
  karma,
  age,
  state,
  {
    id: 'phone',
    header: () => 'Phone',
    meta: { label: 'Phone', className: 'text-muted-foreground' },
    cell: ({ row }) => row.original.phone,
  },
  {
    id: 'referral',
    header: () => 'Referral',
    meta: { label: 'Referral code' },
    cell: ({ row }) =>
      row.original.referralCodeUsed ? <span className="font-mono text-xs">{row.original.referralCodeUsed}</span> : <span className="text-muted-foreground">—</span>,
  },
  status,
  {
    id: 'appliedAt',
    header: 'Applied',
    meta: { sortKey: 'appliedAt', label: 'Applied' },
    cell: ({ row }) => <RelativeTime date={row.original.appliedAt} className="text-muted-foreground" />,
  },
]

export const workerColumns: ColumnDef<WorkerRow, unknown>[] = [
  name,
  status,
  karma,
  age,
  state,
  {
    id: 'completed',
    header: 'Done',
    meta: { sortKey: 'completed', label: 'Completed', className: 'tabular text-right', headerClassName: 'text-right' },
    cell: ({ row }) => formatNumber(row.original.completedCount),
  },
  {
    id: 'approvalRate',
    header: 'Approval',
    meta: { sortKey: 'approvalRate', label: 'Approval rate', className: 'tabular text-right', headerClassName: 'text-right' },
    cell: ({ row }) => {
      const total = row.original.completedCount + row.original.rejectedCount
      return total ? `${Math.round(row.original.approvalRate * 100)}%` : <span className="text-muted-foreground">—</span>
    },
  },
  {
    id: 'earned',
    header: 'Earned',
    meta: { sortKey: 'earned', label: 'Earned', className: 'text-right', headerClassName: 'text-right' },
    cell: ({ row }) => <Money paise={row.original.earnedTotal} className="font-display font-bold" />,
  },
  {
    id: 'lastActive',
    header: 'Last active',
    meta: { sortKey: 'lastActive', label: 'Last active' },
    cell: ({ row }) => <RelativeTime date={row.original.lastActiveAt} className="text-muted-foreground" />,
  },
]
