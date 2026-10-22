import type { ColumnDef } from '@tanstack/react-table'
import { ExternalLink, Image } from 'lucide-react'
import { Money } from '@/components/shared/money'
import { PlatformIcon } from '@/components/shared/platform-icon'
import { formatDateTime, RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { VerifyIcon } from '@/features/reddit/components/verify-badge'
import type { FacetOption } from '@/components/data-table/types'
import type { SubmissionStatus } from '@/db/schema/enums'
import type { QueueRow } from '@/features/submissions/components/review-queue-item'
import { formatNumber } from '@/lib/format'

export const SUBMISSION_STATUS_OPTIONS: FacetOption[] = (
  [
    ['submitted', 'Submitted'],
    ['resubmitted', 'Resubmitted'],
    ['on_hold', 'On hold'],
    ['in_review', 'In review'],
    ['live_check', 'Live check'],
    ['changes_requested', 'Changes requested'],
    ['approved', 'Approved'],
    ['rejected', 'Rejected'],
    ['claimed', 'In progress'],
    ['expired', 'Expired'],
    ['withdrawn', 'Withdrawn'],
  ] satisfies [SubmissionStatus, string][]
).map(([value, label]) => ({ value, label }))

const proof: ColumnDef<QueueRow, unknown> = {
  id: 'proof',
  header: () => 'Proof',
  meta: { label: 'Proof' },
  cell: ({ row }) => (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <VerifyIcon state={row.original.verifyState} />
      {row.original.proofUrl ? (
        <a
          href={row.original.proofUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex max-w-48 items-center gap-1 truncate hover:text-foreground"
        >
          <ExternalLink className="size-3.5 shrink-0" />
          <span className="truncate">{row.original.proofUrl.replace(/^https?:\/\/(www\.)?/, '')}</span>
        </a>
      ) : (
        <span>—</span>
      )}
      {row.original.screenshotCount ? (
        <span className="inline-flex items-center gap-0.5 tabular">
          <Image className="size-3.5" />
          {row.original.screenshotCount}
        </span>
      ) : null}
    </div>
  ),
}

const status: ColumnDef<QueueRow, unknown> = {
  id: 'status',
  header: () => 'Status',
  cell: ({ row }) => (
    <span className="inline-flex items-center gap-1.5">
      <StatusBadge status={row.original.status} />
      {row.original.revision > 1 ? <span className="text-xs text-muted-foreground tabular">v{row.original.revision}</span> : null}
    </span>
  ),
}

const payout: ColumnDef<QueueRow, unknown> = {
  id: 'payout',
  header: 'Payout',
  meta: { sortKey: 'payout', label: 'Payout', className: 'text-right', headerClassName: 'text-right' },
  cell: ({ row }) => <Money paise={row.original.payoutAmount} />,
}

const submitted: ColumnDef<QueueRow, unknown> = {
  id: 'submittedAt',
  header: 'Submitted',
  meta: { sortKey: 'submittedAt', label: 'Submitted' },
  cell: ({ row }) => <RelativeTime date={row.original.submittedAt} className="text-muted-foreground" />,
}

const updated: ColumnDef<QueueRow, unknown> = {
  id: 'updatedAt',
  header: 'Updated',
  meta: { sortKey: 'updatedAt', label: 'Updated' },
  cell: ({ row }) => <RelativeTime date={row.original.updatedAt} className="text-muted-foreground" />,
}

/** Submissions of one gig: the worker is the interesting column. */
export const gigSubmissionColumns: ColumnDef<QueueRow, unknown>[] = [
  {
    id: 'worker',
    header: 'Worker',
    meta: { sortKey: 'worker' },
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{row.original.workerName}</div>
        <div className="truncate text-xs text-muted-foreground">
          u/{row.original.redditUsername} · <span className="tabular">{formatNumber(row.original.karma)}</span> karma
        </div>
      </div>
    ),
  },
  status,
  proof,
  payout,
  submitted,
  updated,
]

const gigCol: ColumnDef<QueueRow, unknown> = {
  id: 'gig',
  header: 'Gig',
  meta: { sortKey: 'gig' },
  cell: ({ row }) => (
    <div className="flex min-w-0 items-center gap-2">
      <PlatformIcon platform={row.original.platform} />
      <div className="min-w-0">
        <div className="max-w-72 truncate font-medium">{row.original.gigTitle}</div>
        {row.original.community ? <div className="truncate text-xs text-muted-foreground">{row.original.community}</div> : null}
      </div>
    </div>
  ),
}

/** Submissions of one worker: the gig is the interesting column. */
export const workerSubmissionColumns: ColumnDef<QueueRow, unknown>[] = [gigCol, status, proof, payout, submitted, updated]

/** Post log: every posted submission across gigs, newest first. */
export const postLogColumns: ColumnDef<QueueRow, unknown>[] = [
  {
    id: 'submittedAt',
    header: 'Posted',
    meta: { sortKey: 'submittedAt' },
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        <RelativeTime date={row.original.submittedAt} />
        {row.original.submittedAt ? (
          <div className="text-xs text-muted-foreground tabular">{formatDateTime(row.original.submittedAt)}</div>
        ) : null}
      </div>
    ),
  },
  gigCol,
  {
    id: 'worker',
    header: 'Worker',
    meta: { sortKey: 'worker', label: 'Worker' },
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{row.original.workerName}</div>
        <div className="truncate text-xs text-muted-foreground">u/{row.original.redditUsername}</div>
      </div>
    ),
  },
  proof,
  status,
  payout,
]
