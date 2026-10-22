import type { ColumnDef } from '@tanstack/react-table'
import { AlertCircle } from 'lucide-react'
import { formatDateTime, RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { listEmailLog } from '../server/email-log'

export type EmailRow = Awaited<ReturnType<typeof listEmailLog>>['rows'][number]

/** "applicationApproved" → "Application approved" */
export function templateLabel(t: string) {
  const s = t.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  const label = s.charAt(0).toUpperCase() + s.slice(1)
  return label.replace(/\botp\b/gi, 'OTP')
}

export const emailColumns: ColumnDef<EmailRow, unknown>[] = [
  {
    id: 'createdAt',
    header: 'Time',
    meta: { sortKey: 'createdAt' },
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        <RelativeTime date={row.original.createdAt} />
        <div className="text-xs text-muted-foreground tabular">{formatDateTime(row.original.createdAt)}</div>
      </div>
    ),
  },
  {
    id: 'to',
    header: 'To',
    meta: { sortKey: 'to', className: 'max-w-60 truncate' },
    cell: ({ row }) => <span className="font-medium">{row.original.to}</span>,
  },
  {
    id: 'template',
    header: () => 'Template',
    meta: { label: 'Template' },
    cell: ({ row }) => (
      <span className="inline-flex h-5.5 items-center rounded-[3px] border bg-muted/50 px-1.5 text-xs whitespace-nowrap text-muted-foreground">
        {templateLabel(row.original.template)}
      </span>
    ),
  },
  {
    id: 'subject',
    header: () => 'Subject',
    meta: { label: 'Subject', className: 'max-w-96 truncate text-muted-foreground' },
    cell: ({ row }) => row.original.subject,
  },
  {
    id: 'status',
    header: () => 'Status',
    cell: ({ row }) =>
      row.original.error ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help items-center gap-1">
              <StatusBadge status={row.original.status} />
              <AlertCircle className="size-3.5 text-destructive" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm break-words">{row.original.error}</TooltipContent>
        </Tooltip>
      ) : (
        <StatusBadge status={row.original.status} />
      ),
  },
]
