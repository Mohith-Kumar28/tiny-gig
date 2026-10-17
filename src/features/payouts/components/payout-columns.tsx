import { Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { downloadCsv } from '@/components/data-table/csv'
import { CopyButton } from '@/components/shared/copy-button'
import { Money } from '@/components/shared/money'
import { RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatNumber } from '@/lib/format'
import type { getPayableBalances, listPayouts } from '../server/payouts'

export type PayoutRow = Awaited<ReturnType<typeof listPayouts>>['rows'][number]
export type BalanceRow = Awaited<ReturnType<typeof getPayableBalances>>[number]

function WorkerCell({ id, name, sub }: { id: string; name: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <Link
        to="/admin/workers/$userId"
        params={{ userId: id }}
        onClick={(e) => e.stopPropagation()}
        className="block truncate font-medium underline-offset-4 hover:underline"
      >
        {name}
      </Link>
      {sub ? <div className="truncate text-xs text-muted-foreground tabular">{sub}</div> : null}
    </div>
  )
}

export function UpiCell({ upi }: { upi: string }) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: keeps copy clicks from opening the row
    // biome-ignore lint/a11y/useKeyWithClickEvents: same
    <span className="inline-flex max-w-56 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      <span className="truncate font-mono text-xs">{upi}</span>
      <CopyButton value={upi} className="size-6" />
    </span>
  )
}

export const balanceColumns: ColumnDef<BalanceRow, unknown>[] = [
  {
    id: 'worker',
    header: 'Worker',
    meta: { sortKey: 'worker' },
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2">
        <WorkerCell id={row.original.userId} name={row.original.fullName} sub={row.original.phone} />
        {row.original.status !== 'approved' ? <StatusBadge status={row.original.status} /> : null}
      </span>
    ),
  },
  { id: 'upi', header: () => 'UPI', meta: { label: 'UPI' }, cell: ({ row }) => <UpiCell upi={row.original.upiId} /> },
  {
    id: 'gigs',
    header: 'Gig earnings',
    meta: { sortKey: 'gigs', label: 'Gig earnings', className: 'text-right', headerClassName: 'text-right' },
    cell: ({ row }) =>
      row.original.gigCount ? (
        <span>
          <span className="mr-1.5 text-xs text-muted-foreground tabular">{formatNumber(row.original.gigCount)} ×</span>
          <Money paise={row.original.gigAmount} />
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'rewards',
    header: 'Referral rewards',
    meta: { sortKey: 'rewards', label: 'Referral rewards', className: 'text-right', headerClassName: 'text-right' },
    cell: ({ row }) =>
      row.original.rewardCount ? (
        <span>
          <span className="mr-1.5 text-xs text-muted-foreground tabular">{formatNumber(row.original.rewardCount)} ×</span>
          <Money paise={row.original.rewardAmount} />
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'total',
    header: 'Total',
    meta: { sortKey: 'total', className: 'text-right', headerClassName: 'text-right' },
    cell: ({ row }) => <Money paise={row.original.total} className="text-base" />,
  },
]

export const payoutColumns: ColumnDef<PayoutRow, unknown>[] = [
  {
    id: 'worker',
    header: 'Worker',
    meta: { sortKey: 'worker' },
    cell: ({ row }) => <WorkerCell id={row.original.workerId} name={row.original.workerName} sub={row.original.phone} />,
  },
  {
    id: 'amount',
    header: 'Amount',
    meta: { sortKey: 'amount', className: 'text-right', headerClassName: 'text-right' },
    cell: ({ row }) => <Money paise={row.original.amount} />,
  },
  { id: 'status', header: () => 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { id: 'upi', header: () => 'UPI', meta: { label: 'UPI' }, cell: ({ row }) => <UpiCell upi={row.original.upiId} /> },
  {
    id: 'items',
    header: () => 'Items',
    meta: { label: 'Items', className: 'tabular text-right text-muted-foreground', headerClassName: 'text-right' },
    cell: ({ row }) => formatNumber(row.original.items),
  },
  {
    id: 'utr',
    header: () => 'UTR',
    meta: { label: 'UTR', className: 'font-mono text-xs' },
    cell: ({ row }) => row.original.utrReference ?? <span className="text-muted-foreground">—</span>,
  },
  {
    id: 'createdAt',
    header: 'Created',
    meta: { sortKey: 'createdAt', label: 'Created' },
    cell: ({ row }) => <RelativeTime date={row.original.createdAt} className="text-muted-foreground" />,
  },
  {
    id: 'paidAt',
    header: 'Paid',
    meta: { sortKey: 'paidAt', label: 'Paid' },
    cell: ({ row }) => <RelativeTime date={row.original.paidAt} className="text-muted-foreground" />,
  },
  {
    id: 'note',
    header: () => 'Note',
    meta: { label: 'Note', className: 'max-w-48 truncate text-muted-foreground' },
    cell: ({ row }) => row.original.note ?? '—',
  },
]

export function exportUpiCsv(rows: PayoutRow[]) {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCsv(`tinygig-upi-payouts-${stamp}`, rows, [
    { header: 'Name', value: (r) => r.workerName },
    { header: 'Phone', value: (r) => r.phone },
    { header: 'UPI', value: (r) => r.upiId },
    { header: 'Amount (INR)', value: (r) => (r.amount / 100).toFixed(2) },
    { header: 'Payout ID', value: (r) => r.id },
  ])
}
