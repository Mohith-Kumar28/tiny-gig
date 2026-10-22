import { keepPreviousData, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Copy, ExternalLink, Hand, Inbox, Pencil } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { useTableSearch } from '@/components/data-table/use-table-search'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { PLATFORM_LABELS, PlatformIcon } from '@/components/shared/platform-icon'
import { formatDateTime, RelativeTime } from '@/components/shared/relative-time'
import { StatCard, StatGrid } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { SUBMISSION_STATUSES } from '@/db/schema/enums'
import { ClientChip } from '@/features/accounts/components/client-chip'
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

function Panel({ title, children, className, flush }: { title: string; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cn('min-w-0 overflow-hidden rounded-lg border bg-card', className)}>
      <h2 className="border-b px-4 py-2.5 font-display text-sm font-bold">{title}</h2>
      <div className={cn('text-sm', !flush && 'px-4 py-3')}>{children}</div>
    </section>
  )
}

function Term({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 bg-card px-4 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right tabular">{children}</dd>
    </div>
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
        <div className="space-y-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <PlatformIcon platform={g.platform} />
                {PLATFORM_LABELS[g.platform]}
                {g.community ? ` · ${g.community}` : ''} · {TASK_TYPE_LABELS[g.taskType]}
              </span>
              <StatusBadge status={g.status} />
              {data.client ? <ClientChip name={data.client.name} color={data.client.color} /> : null}
            </div>
            <h1 className="max-w-4xl font-display text-2xl leading-tight font-bold text-balance sm:text-[1.75rem]">{g.title}</h1>
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
          <div className="flex flex-wrap items-center gap-2 border-y py-2.5">
            {g.status === 'live' && g.claimedSlots < g.totalSlots ? (
              <Button asChild size="sm" variant={data.interested ? 'default' : 'outline'}>
                <Link to="/admin/gigs/$gigId/select" params={{ gigId }}>
                  <Hand /> Pick accounts{data.interested ? ` · ${formatNumber(data.interested)} interested` : ''}
                </Link>
              </Button>
            ) : null}
            {waiting ? (
              <Button asChild size="sm">
                <Link to="/admin/review" search={{ gigId }}>
                  <Inbox /> Review {formatNumber(waiting)} pending
                </Link>
              </Button>
            ) : null}
            <span aria-hidden className="hidden flex-1 sm:block" />
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

      <StatGrid className="grid-cols-2 md:grid-cols-5">
        <StatCard
          label="Slots filled"
          value={
            <>
              {formatNumber(g.claimedSlots)}
              <span className="text-base font-semibold text-muted-foreground"> / {formatNumber(g.totalSlots)}</span>
            </>
          }
          hint={<SlotsBar claimed={g.claimedSlots} total={g.totalSlots} className="mt-1 w-full max-w-36 [&>div:first-child]:hidden" />}
        />
        <StatCard
          label="To review"
          value={formatNumber(waiting)}
          tone={waiting ? 'attention' : 'default'}
          to={waiting ? '/admin/review' : undefined}
          search={waiting ? { gigId } : undefined}
          hint={waiting ? 'Open in the review inbox' : 'Nothing waiting'}
        />
        <StatCard label="Approved" value={formatNumber(approved)} />
        <StatCard
          label="Spent"
          value={<Money paise={data.money.spent} className={cn('font-bold', data.money.spent > 0 && 'ledger-total')} />}
          hint="Approved work on this gig"
        />
        <StatCard
          className="col-span-2 md:col-span-1"
          label="Max exposure"
          value={<Money paise={data.money.maxExposure} className="font-bold" />}
          hint={
            data.money.min !== data.money.max
              ? `${formatMoney(data.money.min)}-${formatMoney(data.money.max)} per task`
              : `${formatMoney(data.money.max)} per task`
          }
        />
      </StatGrid>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Panel title="Brief">
            <p className="whitespace-pre-wrap text-pretty">{g.brief}</p>
            {g.targetUrl ? (
              <a href={g.targetUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex max-w-full items-center gap-1.5 text-ink underline-offset-4 hover:underline">
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
          <Panel title="Requirements & timing" flush>
            <dl className="grid gap-px bg-border sm:grid-cols-2">
              <Term label="Min karma">{g.minKarma ? formatNumber(g.minKarma) : 'Any'}</Term>
              <Term label="Account age">{g.minAccountAgeMonths ? `${g.minAccountAgeMonths}+ months` : 'Any'}</Term>
              <Term label="States">{g.allowedStates.length ? g.allowedStates.join(', ') : 'All of India'}</Term>
              <Term label="Time to submit">{formatHours(g.claimWindowHours)}</Term>
              <Term label="Live hold">{g.liveHoldHours ? formatHours(g.liveHoldHours) : 'Approve immediately'}</Term>
              <Term label="Starts">{g.startsAt ? formatDateTime(g.startsAt) : 'On publish'}</Term>
              <Term label="Ends">{g.endsAt ? formatDateTime(g.endsAt) : 'No end date'}</Term>
              <Term label="Priority">{g.priority}</Term>
            </dl>
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel title="Reviewer checklist" flush>
            {g.reviewChecklist.length ? (
              <ol className="divide-y">
                {g.reviewChecklist.map((c, i) => (
                  <li key={i} className="flex items-baseline gap-3 px-4 py-2">
                    <span className="w-4 shrink-0 text-right text-xs text-muted-foreground tabular">{i + 1}</span>
                    {c}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="px-4 py-3 text-muted-foreground">No checklist. Add one from Edit so reviewers know what to check.</p>
            )}
          </Panel>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Submissions</h2>
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
