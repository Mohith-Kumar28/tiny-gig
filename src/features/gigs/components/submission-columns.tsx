import type { ColumnDef } from '@tanstack/react-table'
import { ExternalLink, Image } from 'lucide-react'
import { Money } from '@/components/shared/money'
import { PlatformIcon } from '@/components/shared/platform-icon'
import { formatDateTime, RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import type { FacetOption } from '@/components/data-table/types'
import type { SubmissionStatus } from '@/db/schema/enums'
import type { QueueRow } from '@/features/submissions/components/review-queue-item'
import { clientColumn, singleClient } from '@/features/clients/components/client-filter'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

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

/** "reddit.com" + the last useful bit of the path, so two links to one subreddit still look different. */
function proofParts(url: string) {
  try {
    const u = new URL(url)
    const segs = u.pathname.split('/').filter(Boolean)
    return { host: u.hostname.replace(/^www\./, ''), tail: segs.at(-1) ?? '' }
  } catch {
    return { host: url, tail: '' }
  }
}

const proof: ColumnDef<QueueRow, unknown> = {
  id: 'proof',
  header: () => 'Proof',
  meta: { label: 'Proof' },
  cell: ({ row }) => (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {row.original.proofUrl ? (
        <a
          href={row.original.proofUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={row.original.proofUrl}
          className="inline-flex max-w-52 items-center gap-1 rounded-sm text-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ExternalLink className="size-3.5 shrink-0" />
          <span className="shrink-0">{proofParts(row.original.proofUrl).host}</span>
          {proofParts(row.original.proofUrl).tail ? (
            <span className="truncate text-muted-foreground">/{proofParts(row.original.proofUrl).tail}</span>
          ) : null}
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
  cell: ({ row }) => (
    <Money
      paise={row.original.payoutAmount}
      className={cn(
        'font-display font-bold',
        (row.original.status === 'rejected' || row.original.status === 'expired' || row.original.status === 'withdrawn') &&
          'ledger-struck text-muted-foreground',
      )}
    />
  ),
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
  clientColumn<QueueRow>(singleClient),
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
        <div className="max-w-64 truncate font-medium xl:max-w-80">{row.original.gigTitle}</div>
        {row.original.community ? <div className="truncate text-xs text-muted-foreground">{row.original.community}</div> : null}
      </div>
    </div>
  ),
}

/** Submissions of one worker: the gig is the interesting column. */
export const workerSubmissionColumns: ColumnDef<QueueRow, unknown>[] = [gigCol, clientColumn<QueueRow>(singleClient), status, proof, payout, submitted, updated]

/** Post log: every posted submission across gigs, newest first. */
export const postLogColumns: ColumnDef<QueueRow, unknown>[] = [
  {
    id: 'submittedAt',
    header: 'Posted',
    meta: { sortKey: 'submittedAt' },
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {row.original.submittedAt ? <div className="tabular">{formatDateTime(row.original.submittedAt)}</div> : null}
        <RelativeTime date={row.original.submittedAt} className="text-xs text-muted-foreground" />
      </div>
    ),
  },
  gigCol,
  clientColumn<QueueRow>(singleClient),
  {
    id: 'worker',
    header: 'Worker',
    meta: { sortKey: 'worker', label: 'Worker' },
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{row.original.workerName}</div>
        {row.original.platform === 'reddit' ? (
          <div className="truncate text-xs text-muted-foreground">u/{row.original.redditUsername}</div>
        ) : null}
      </div>
    ),
  },
  status,
  proof,
  payout,
]
