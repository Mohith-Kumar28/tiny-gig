import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, Flag, FlagOff, MoreHorizontal } from 'lucide-react'
import { Money } from '@/components/shared/money'
import { RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatNumber } from '@/lib/format'
import type { listReferrals } from '../server/referrals'

export type ReferralRow = Awaited<ReturnType<typeof listReferrals>>['rows'][number]

const dash = <span className="text-muted-foreground">—</span>

function WorkerLink({ id, name }: { id: string; name: string }) {
  return (
    <a href={`/admin/workers/${id}`} className="truncate underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>
      {name}
    </a>
  )
}

export function referralColumns(actions: { onFlag: (row: ReferralRow) => void; onUnflag: (row: ReferralRow) => void }): ColumnDef<ReferralRow, unknown>[] {
  return [
    {
      id: 'referee',
      header: () => 'Referred worker',
      meta: { label: 'Referred worker' },
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate font-medium">
            <WorkerLink id={row.original.refereeId} name={row.original.refereeName} />
          </span>
          <StatusBadge status={row.original.refereeStatus} />
        </div>
      ),
    },
    {
      id: 'referrer',
      header: 'Referrer',
      meta: { sortKey: 'referrer', label: 'Referrer', className: 'max-w-44' },
      cell: ({ row }) => <WorkerLink id={row.original.referrerId} name={row.original.referrerName} />,
    },
    {
      id: 'code',
      header: () => 'Code',
      meta: { label: 'Code' },
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
    },
    {
      id: 'attributedAt',
      header: 'Joined',
      meta: { sortKey: 'attributedAt', label: 'Joined' },
      cell: ({ row }) => <RelativeTime date={row.original.attributedAt} className="text-muted-foreground" />,
    },
    {
      id: 'approvedAt',
      header: () => 'Approved',
      meta: { label: 'Approved' },
      cell: ({ row }) => (row.original.approvedAt ? <RelativeTime date={row.original.approvedAt} className="text-muted-foreground" /> : dash),
    },
    {
      id: 'firstGig',
      header: () => 'First gig',
      meta: { label: 'First gig' },
      cell: ({ row }) =>
        row.original.firstGigApprovedAt ? <RelativeTime date={row.original.firstGigApprovedAt} className="text-muted-foreground" /> : dash,
    },
    {
      id: 'gigsApproved',
      header: 'Gigs',
      meta: { sortKey: 'gigsApproved', label: 'Gigs approved', className: 'tabular text-right', headerClassName: 'text-right' },
      cell: ({ row }) => formatNumber(row.original.gigsApproved),
    },
    {
      id: 'earned',
      header: 'Earned',
      meta: { sortKey: 'earned', label: 'Earned', className: 'text-right', headerClassName: 'text-right' },
      cell: ({ row }) => <Money paise={row.original.earned} className="font-display font-bold" />,
    },
    {
      id: 'flag',
      header: () => 'Flag',
      meta: { label: 'Flag' },
      cell: ({ row }) =>
        row.original.flagged ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-warning-foreground dark:text-warning">
                <AlertTriangle className="size-3.5" /> Flagged
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{row.original.flagReason ?? 'Flagged'}</TooltipContent>
          </Tooltip>
        ) : (
          dash
        ),
    },
    {
      id: 'actions',
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      meta: { className: 'w-10 text-right', headerClassName: 'w-10' },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7" aria-label="Referral actions" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.original.flagged ? (
              <DropdownMenuItem onSelect={() => actions.onUnflag(row.original)}>
                <FlagOff /> Unflag and re-evaluate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem variant="destructive" onSelect={() => actions.onFlag(row.original)}>
                <Flag /> Flag as suspicious…
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
