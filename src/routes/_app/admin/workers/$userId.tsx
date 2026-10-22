import { keepPreviousData, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, CheckCircle2, Gift, Inbox, ListChecks, Wallet } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { useTableSearch } from '@/components/data-table/use-table-search'
import { CopyButton } from '@/components/shared/copy-button'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { formatDate, formatDateTime, RelativeTime } from '@/components/shared/relative-time'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge, statusLabel } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SUBMISSION_STATUSES } from '@/db/schema/enums'
import { SUBMISSION_STATUS_OPTIONS, workerSubmissionColumns } from '@/features/gigs/components/submission-columns'
import type { QueueRow } from '@/features/submissions/components/review-queue-item'
import { SubmissionReviewSheet } from '@/features/submissions/components/submission-review-sheet'
import { reviewQueueQuery } from '@/features/submissions/queries'
import { WorkerAccountsCard } from '@/features/accounts/components/worker-accounts-card'
import { WorkerAdminNote } from '@/features/workers/components/worker-admin-note'
import { WorkerStatusActions } from '@/features/workers/components/worker-status-actions'
import { workerDetailQuery } from '@/features/workers/queries'
import { formatNumber } from '@/lib/format'
import { facet, tableSearchSchema } from '@/lib/table-query'

const TABS = ['submissions', 'payouts', 'referrals'] as const

const searchSchema = tableSearchSchema.extend({
  tab: z.enum(TABS).optional().catch(undefined),
  status: facet(SUBMISSION_STATUSES),
})

export const Route = createFileRoute('/_app/admin/workers/$userId')({
  validateSearch: searchSchema,
  loader: ({ context, params }) => context.queryClient.ensureQueryData(workerDetailQuery(params.userId)),
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.profile.fullName ?? 'Worker'} · TinyGig Admin` }] }),
  component: WorkerDetailPage,
})

function Fact({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex min-w-0 items-center gap-1 text-sm">{children}</dd>
    </div>
  )
}

function WorkerDetailPage() {
  const { userId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useTableSearch(navigate as never)
  const { data } = useSuspenseQuery(workerDetailQuery(userId))
  const p = data.profile
  const tab = search.tab ?? 'submissions'
  const [openSubmission, setOpenSubmission] = useState<string | null>(null)

  const subSearch = { tab: 'all' as const, workerId: userId, status: search.status, q: search.q, sort: search.sort, page: search.page, perPage: search.perPage ?? 20 }
  const { data: subs, isFetching } = useQuery({
    ...reviewQueueQuery(subSearch),
    placeholderData: keepPreviousData,
    enabled: tab === 'submissions',
  })

  const decided = p.completedCount + p.rejectedCount
  const open = ['claimed', 'submitted', 'resubmitted', 'changes_requested', 'live_check'].reduce((n, s) => n + (data.statusCounts[s] ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 text-muted-foreground">
          <Link to="/admin/workers">
            <ArrowLeft /> Workers
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.65rem]">{p.fullName}</h1>
              <StatusBadge status={p.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              u/{p.redditUsername} · {p.state} · applied <RelativeTime date={p.appliedAt} />
              {p.lastActiveAt ? (
                <>
                  {' '}· last active <RelativeTime date={p.lastActiveAt} />
                </>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/review" search={{ tab: 'all', workerId: userId }}>
                <Inbox /> Open in review inbox
              </Link>
            </Button>
            <WorkerStatusActions userId={userId} name={p.fullName} status={p.status} />
          </div>
        </div>
        {p.reviewNote && (p.status === 'suspended' || p.status === 'rejected') ? (
          <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">{statusLabel(p.status)} reason: </span>
            {p.reviewNote}
          </p>
        ) : null}
        {data.referredBy?.referral.flagged ? (
          <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="size-4 shrink-0 text-warning-foreground dark:text-warning" />
            <span>Flagged referral: {data.referredBy.referral.flagReason}</span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Completed" value={formatNumber(p.completedCount)} icon={CheckCircle2} tone="success" hint={`${formatNumber(p.rejectedCount)} rejected`} />
        <StatCard
          label="Approval rate"
          value={decided ? `${Math.round((p.completedCount / decided) * 100)}%` : '—'}
          icon={ListChecks}
          hint={decided ? `${formatNumber(decided)} decided` : 'No decisions yet'}
        />
        <StatCard label="Earned" value={<Money paise={p.earnedTotal} />} icon={Wallet} hint={`${data.payouts.filter((x) => x.status === 'paid').length} payouts paid`} />
        <StatCard label="Open work" value={formatNumber(open)} icon={Inbox} hint={`${formatNumber(data.statusCounts.submitted ?? 0)} waiting for review`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Profile</h2>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            <Fact label="Email">
              <span className="truncate">{p.email}</span>
              <CopyButton value={p.email} />
            </Fact>
            <Fact label="Phone">
              <span className="tabular">{p.phone}</span>
              <CopyButton value={p.phone} />
            </Fact>
            <Fact label="UPI ID">
              <span className="truncate font-mono text-xs">{p.upiId}</span>
              <CopyButton value={p.upiId} />
            </Fact>
            <Fact label="State">{p.state}</Fact>
            <Fact label="Applied">{formatDateTime(p.appliedAt)}</Fact>
            <Fact label="Referral code">
              <span className="font-mono text-xs">{p.ownReferralCode}</span>
              <CopyButton value={p.ownReferralCode} />
            </Fact>
            {p.languages ? <Fact label="Languages">{p.languages}</Fact> : null}
            {p.bio ? (
              <Fact label="Bio" className="sm:col-span-2 xl:col-span-3">
                <span className="whitespace-pre-wrap text-pretty">{p.bio}</span>
              </Fact>
            ) : null}
          </dl>
          {Object.keys(data.statusCounts).length ? (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t pt-3">
              <span className="mr-1 text-xs text-muted-foreground">All submissions</span>
              {Object.entries(data.statusCounts).map(([s, n]) => (
                <button key={s} type="button" onClick={() => onSearchChange({ tab: undefined, status: [s] })}>
                  <StatusBadge status={s} label={`${statusLabel(s)} · ${n}`} className="hover:opacity-80" />
                </button>
              ))}
            </div>
          ) : null}
        </section>
        <section className="rounded-xl border bg-card p-4">
          <WorkerAdminNote userId={userId} initial={p.adminNote} />
        </section>
      </div>

      <WorkerAccountsCard workerId={userId} accounts={data.accounts} />

      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v === 'submissions' ? undefined : (v as (typeof TABS)[number]) }, replace: true, resetScroll: false })}>
        <TabsList>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts · {data.payouts.length}</TabsTrigger>
          <TabsTrigger value="referrals">Referrals · {data.referrals.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="mt-2">
          <DataTable<QueueRow>
            columns={workerSubmissionColumns}
            data={subs}
            search={search}
            onSearchChange={onSearchChange}
            getRowId={(r) => r.id}
            isFetching={isFetching}
            searchPlaceholder="Search gig or proof link…"
            onRowClick={(r) => setOpenSubmission(r.id)}
            activeRowId={openSubmission ?? undefined}
            hasActiveFilters={Boolean(search.status || search.q)}
            onResetFilters={() => onSearchChange({ status: undefined, q: undefined, sort: undefined })}
            filters={
              <DataTableFacetedFilter
                title="Status"
                options={SUBMISSION_STATUS_OPTIONS}
                value={search.status}
                counts={data.statusCounts}
                onChange={(v) => onSearchChange({ status: v })}
              />
            }
            empty={<EmptyState icon={Inbox} title="No submissions" description="This worker hasn't claimed any matching gigs." className="border-0 bg-transparent" />}
          />
        </TabsContent>

        <TabsContent value="payouts" className="mt-2">
          {data.payouts.length ? (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 text-xs">Created</TableHead>
                    <TableHead className="h-9 text-xs">Status</TableHead>
                    <TableHead className="h-9 text-right text-xs">Amount</TableHead>
                    <TableHead className="h-9 text-xs">UPI</TableHead>
                    <TableHead className="h-9 text-xs">UTR</TableHead>
                    <TableHead className="h-9 text-xs">Paid</TableHead>
                    <TableHead className="h-9 text-xs">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payouts.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="py-2.5">{formatDate(po.createdAt)}</TableCell>
                      <TableCell className="py-2.5">
                        <StatusBadge status={po.status} />
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <Money paise={po.amount} />
                      </TableCell>
                      <TableCell className="py-2.5 font-mono text-xs">{po.upiId}</TableCell>
                      <TableCell className="py-2.5 font-mono text-xs">{po.utrReference ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="py-2.5">
                        <RelativeTime date={po.paidAt} className="text-muted-foreground" />
                      </TableCell>
                      <TableCell className="max-w-56 truncate py-2.5 text-muted-foreground">{po.note ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState icon={Wallet} title="No payouts yet" description="Create a payout from the Payouts page once they have approved earnings." />
          )}
          <Button asChild variant="link" className="mt-1 px-0">
            <Link to="/admin/payouts" search={{ tab: 'payouts', q: p.fullName }}>
              Manage in Payouts →
            </Link>
          </Button>
        </TabsContent>

        <TabsContent value="referrals" className="mt-2 space-y-4">
          <section className="rounded-xl border bg-card p-4 text-sm">
            <h3 className="mb-2 text-sm font-semibold">Referred by</h3>
            {data.referredBy ? (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/admin/workers/$userId"
                  params={{ userId: data.referredBy.referral.referrerId }}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {data.referredBy.referrerName ?? 'Unknown worker'}
                </Link>
                <span className="text-muted-foreground">
                  with code <span className="font-mono">{data.referredBy.referral.code}</span> ·{' '}
                  <RelativeTime date={data.referredBy.referral.attributedAt} />
                </span>
                {data.referredBy.referral.flagged ? <StatusBadge status="pending_review" label="Flagged" /> : null}
              </div>
            ) : p.referralCodeUsed ? (
              <span className="text-muted-foreground">
                Used code <span className="font-mono">{p.referralCodeUsed}</span> but it didn't match a worker.
              </span>
            ) : (
              <span className="text-muted-foreground">Signed up without a referral.</span>
            )}
          </section>
          {data.referrals.length ? (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 text-xs">Referred worker</TableHead>
                    <TableHead className="h-9 text-xs">Status</TableHead>
                    <TableHead className="h-9 text-right text-xs">Gigs approved</TableHead>
                    <TableHead className="h-9 text-right text-xs">Earned</TableHead>
                    <TableHead className="h-9 text-xs">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.referrals.map((r) => (
                    <TableRow
                      key={r.referral.id}
                      className="cursor-pointer"
                      onClick={() => navigate({ to: '/admin/workers/$userId', params: { userId: r.referral.refereeId }, search: {} })}
                    >
                      <TableCell className="py-2.5 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          {r.name ?? 'Unknown'}
                          {r.referral.flagged ? <AlertTriangle className="size-3.5 text-warning-foreground dark:text-warning" /> : null}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5">{r.status ? <StatusBadge status={r.status} /> : '—'}</TableCell>
                      <TableCell className="py-2.5 text-right tabular">{formatNumber(r.referral.gigsApproved)}</TableCell>
                      <TableCell className="py-2.5 text-right">
                        <Money paise={r.referral.earned} />
                      </TableCell>
                      <TableCell className="py-2.5">
                        <RelativeTime date={r.referral.attributedAt} className="text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState icon={Gift} title="No referrals yet" description={`Their code ${p.ownReferralCode} hasn't been used.`} />
          )}
        </TabsContent>
      </Tabs>

      <SubmissionReviewSheet submissionId={openSubmission} onOpenChange={(o) => !o && setOpenSubmission(null)} />
    </div>
  )
}
