import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, Ban, Check, MoreHorizontal } from 'lucide-react'
import { Money } from '@/components/shared/money'
import { RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { listRewards } from '../server/referrals'

export type RewardRow = Awaited<ReturnType<typeof listRewards>>['rows'][number]

export function rewardColumns(actions: {
  onApprove: (row: RewardRow) => void
  onVoid: (row: RewardRow) => void
}): ColumnDef<RewardRow, unknown>[] {
  return [
    {
      id: 'worker',
      header: 'Worker',
      meta: { sortKey: 'worker', label: 'Worker' },
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-1.5 font-medium">
          <a href={`/admin/workers/${row.original.workerId}`} className="truncate underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>
            {row.original.workerName}
          </a>
          {row.original.flagged ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="size-3.5 shrink-0 text-warning-foreground dark:text-warning" aria-label="Flagged referral" />
              </TooltipTrigger>
              <TooltipContent>Linked referral is flagged (shared phone, UPI or Reddit). Check before approving.</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      ),
    },
    {
      id: 'program',
      header: () => 'Program',
      meta: { label: 'Program', className: 'max-w-48 truncate text-muted-foreground' },
      cell: ({ row }) => row.original.programName,
    },
    {
      id: 'role',
      header: () => 'Role',
      meta: { label: 'Role' },
      cell: ({ row }) => (
        <Badge variant={row.original.role === 'referrer' ? 'secondary' : 'outline'} className="capitalize">
          {row.original.role}
        </Badge>
      ),
    },
    {
      id: 'tier',
      header: () => 'Tier',
      meta: { label: 'Tier', className: 'tabular text-right text-muted-foreground', headerClassName: 'text-right' },
      cell: ({ row }) => (row.original.role === 'referrer' ? `#${row.original.tier}` : '—'),
    },
    {
      id: 'amount',
      header: 'Amount',
      meta: { sortKey: 'amount', label: 'Amount', className: 'text-right', headerClassName: 'text-right' },
      cell: ({ row }) => <Money paise={row.original.amount} />,
    },
    {
      id: 'status',
      header: () => 'Status',
      meta: { label: 'Status' },
      cell: ({ row }) =>
        row.original.note ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <StatusBadge status={row.original.status} />
              </span>
            </TooltipTrigger>
            <TooltipContent>{row.original.note}</TooltipContent>
          </Tooltip>
        ) : (
          <StatusBadge status={row.original.status} />
        ),
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
      meta: { className: 'w-10 text-right', headerClassName: 'w-10' },
      cell: ({ row }) => {
        if (row.original.status !== 'pending_review') return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" aria-label="Reward actions" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => actions.onApprove(row.original)}>
                <Check /> Approve
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => actions.onVoid(row.original)}>
                <Ban /> Void…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
