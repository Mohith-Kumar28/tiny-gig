import { keepPreviousData, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Copy, ExternalLink, Inbox, ListChecks, Pencil } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { useTableSearch } from '@/components/data-table/use-table-search'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { PLATFORM_LABELS, PlatformIcon } from '@/components/shared/platform-icon'
import { formatDateTime, RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { SUBMISSION_STATUSES } from '@/db/schema/enums'
import { statusTransitions, useDuplicateGig, useGigStatus } from '@/features/gigs/components/gig-actions'
import { SlotsBar } from '@/features/gigs/components/gig-columns'
import { gigSubmissionColumns, SUBMISSION_STATUS_OPTIONS } from '@/features/gigs/components/submission-columns'
import { formatHours, TASK_TYPE_LABELS } from '@/features/gigs/components/worker-gig-meta'
import { gigAdminQuery } from '@/features/gigs/queries'
import type { QueueRow } from '@/features/submissions/components/review-queue-item'
import { SubmissionReviewSheet } from '@/features/submissions/components/submission-review-sheet'
import { reviewQueueQuery } from '@/features/submissions/queries'
import { formatMoney, formatNumber } from '@/lib/format'
import { facet, tableSearchSchema } from '@/lib/table-query'
import { cn } from '@/lib/utils'

const searchSchema = tableSearchSchema.extend({ status: facet(SUBMISSION_STATUSES) })

export const Route = createFileRoute('/_app/admin/gigs/$gigId/')({
  validateSearch: searchSchema,
  loader: ({ context, params }) => context.queryClient.ensureQueryData(gigAdminQuery(params.gigId)),
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.gig.title ?? 'Gig'} · TinyGig Admin` }] }),
  component: GigDetailPage,
})

function Kpi({ label, value, hint, tone, to }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'attention'; to?: ReactNode }) {
  return (
    <div className={cn('min-w-0 px-4 py-3', tone === 'attention' && 'bg-primary/[0.05]')}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('mt-1 font-display text-xl font-semibold tabular', tone === 'attention' && 'text-primary')}>{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
      {to}
    </div>
  )
}

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border bg-card p-4', className)}>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div className="text-sm">{children}</div>
    </section>
  )
}

function GigDetailPage() {
  const { gigId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useTableSearch(navigate as never)
  const { data } = useSuspenseQuery(gigAdminQuery(gigId))
  const { gig: g, counts } = data
  const [openSubmission, setOpenSubmission] = useState<string | null>(null)
  const setStatus = useGigStatus()
  const duplicate = useDuplicateGig()

  const subSearch = { tab: 'all' as const, gigId, status: search.status, q: search.q, sort: search.sort, page: search.page, perPage: search.perPage ?? 20 }
  const { data: subs, isFetching } = useQuery({ ...reviewQueueQuery(subSearch), placeholderData: keepPreviousData })

  const waiting = (counts.submitted ?? 0) + (counts.resubmitted ?? 0)
  const approved = counts.approved ?? 0

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 text-muted-foreground">
          <Link to="/admin/gigs">
            <ArrowLeft /> Gigs
          </Link>
        </Button>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <PlatformIcon platform={g.platform} />
                {PLATFORM_LABELS[g.platform]}
                {g.community ? ` · ${g.community}` : ''} · {TASK_TYPE_LABELS[g.taskType]}
              </span>
              <StatusBadge status={g.status} />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-balance sm:text-[1.65rem]">{g.title}</h1>
            <p className="text-sm text-muted-foreground">
              Created <RelativeTime date={g.createdAt} />
              {g.publishedAt ? (
                <>
                  {' '}· published <RelativeTime date={g.publishedAt} />
                </>
              ) : null}
              {g.endsAt ? <> · ends {formatDateTime(g.endsAt)}</> : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {waiting ? (
              <Button asChild size="sm">
                <Link to="/admin/review" search={{ gigId }}>
                  <Inbox /> Review {formatNumber(waiting)} pending
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/gigs/$gigId/edit" params={{ gigId }}>
                <Pencil /> Edit
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => duplicate.mutate(gigId)} disabled={duplicate.isPending}>
              <Copy /> Duplicate
            </Button>
            {statusTransitions(g.status).map((t) => (
              <Button
                key={t.status}
                size="sm"
                variant={t.status === 'live' && !waiting ? 'default' : 'outline'}
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate({ ids: [gigId], status: t.status })}
              >
                <t.icon /> {t.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y overflow-hidden rounded-xl border bg-card sm:grid-cols-4 sm:divide-y-0 xl:grid-cols-8 [&>*]:border-border">
        <Kpi label="Slots claimed" value={<SlotsBar claimed={g.claimedSlots} total={g.totalSlots} className="w-full max-w-28 [&>div:first-child]:text-base" />} />
        <Kpi label="Waiting review" value={formatNumber(waiting)} tone={waiting ? 'attention' : undefined} hint={counts.resubmitted ? `${counts.resubmitted} resubmitted` : undefined} />
        <Kpi label="Live check" value={formatNumber(counts.live_check ?? 0)} hint={g.liveHoldHours ? `${formatHours(g.liveHoldHours)} hold` : 'No hold'} />
        <Kpi label="Approved" value={formatNumber(approved)} />
        <Kpi label="Rejected" value={formatNumber(counts.rejected ?? 0)} hint={counts.changes_requested ? `${counts.changes_requested} fixing` : undefined} />
        <Kpi label="Expired" value={formatNumber(counts.expired ?? 0)} hint={counts.claimed ? `${counts.claimed} in progress` : undefined} />
        <Kpi label="Payout / task" value={<Money paise={g.payoutAmount} />} />
        <Kpi label="Committed spend" value={<Money paise={approved * g.payoutAmount} />} hint={`of ${formatMoney(g.totalSlots * g.payoutAmount)} budget`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Panel title="Brief">
            <p className="whitespace-pre-wrap text-pretty">{g.brief}</p>
            {g.targetUrl ? (
              <a href={g.targetUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex max-w-full items-center gap-1.5 text-primary hover:underline">
                <ExternalLink className="size-3.5 shrink-0" />
                <span className="truncate">{g.targetUrl}</span>
              </a>
            ) : null}
          </Panel>
          {g.contentGuidelines || g.sampleContent ? (
            <div className="grid gap-4 md:grid-cols-2">
              {g.contentGuidelines ? (
                <Panel title="Content guidelines">
                  <p className="whitespace-pre-wrap text-pretty text-muted-foreground">{g.contentGuidelines}</p>
                </Panel>
              ) : null}
              {g.sampleContent ? (
                <Panel title="Sample content">
                  <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">{g.sampleContent}</p>
                </Panel>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="space-y-4">
          <Panel title="Reviewer checklist">
            {g.reviewChecklist.length ? (
              <ol className="space-y-1.5">
                {g.reviewChecklist.map((c, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static list
                  <li key={i} className="flex gap-2">
                    <ListChecks className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    {c}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground">No checklist.</p>
            )}
          </Panel>
          <Panel title="Requirements & timing">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-muted-foreground">Min karma</dt>
              <dd className="tabular">{g.minKarma ? formatNumber(g.minKarma) : 'Any'}</dd>
              <dt className="text-muted-foreground">Account age</dt>
              <dd className="tabular">{g.minAccountAgeMonths ? `${g.minAccountAgeMonths}+ months` : 'Any'}</dd>
              <dt className="text-muted-foreground">States</dt>
              <dd>{g.allowedStates.length ? g.allowedStates.join(', ') : 'All of India'}</dd>
              <dt className="text-muted-foreground">Claim window</dt>
              <dd>{formatHours(g.claimWindowHours)}</dd>
              <dt className="text-muted-foreground">Live hold</dt>
              <dd>{g.liveHoldHours ? formatHours(g.liveHoldHours) : 'Approve immediately'}</dd>
              <dt className="text-muted-foreground">Starts</dt>
              <dd>{g.startsAt ? formatDateTime(g.startsAt) : 'On publish'}</dd>
              <dt className="text-muted-foreground">Ends</dt>
              <dd>{g.endsAt ? formatDateTime(g.endsAt) : 'No end date'}</dd>
              <dt className="text-muted-foreground">Priority</dt>
              <dd className="tabular">{g.priority}</dd>
            </dl>
          </Panel>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Submissions</h2>
        <DataTable<QueueRow>
          columns={gigSubmissionColumns}
          data={subs}
          search={search}
          onSearchChange={onSearchChange}
          getRowId={(r) => r.id}
          isFetching={isFetching}
          searchPlaceholder="Search worker, Reddit, proof link…"
          onRowClick={(r) => setOpenSubmission(r.id)}
          activeRowId={openSubmission ?? undefined}
          hasActiveFilters={Boolean(search.status || search.q)}
          onResetFilters={() => navigate({ search: {}, replace: true, resetScroll: false })}
          filters={
            <DataTableFacetedFilter
              title="Status"
              options={SUBMISSION_STATUS_OPTIONS}
              value={search.status}
              counts={counts}
              onChange={(v) => onSearchChange({ status: v })}
            />
          }
          empty={
            <EmptyState
              icon={Inbox}
              title="No submissions yet"
              description={g.status === 'live' ? 'Workers will show up here as they claim slots.' : 'Publish the gig to start getting submissions.'}
              className="border-0 bg-transparent"
            />
          }
        />
      </section>

      <SubmissionReviewSheet submissionId={openSubmission} onOpenChange={(o) => !o && setOpenSubmission(null)} />
    </div>
  )
}
