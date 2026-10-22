import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, ShieldOff } from 'lucide-react'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { useTableSearch } from '@/components/data-table/use-table-search'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { formatDate, formatDateTime, RelativeTime } from '@/components/shared/relative-time'
import { Button } from '@/components/ui/button'
import { RULE_LABELS, type RuleKey } from '@/features/accounts/cooldowns'
import { accountLabel } from '@/features/accounts/rules'
import { blockLogSearchSchema, listBlockLog } from '@/features/accounts/server/blocks'

type Row = Awaited<ReturnType<typeof listBlockLog>>['rows'][number]

const blockLogQuery = (search: Parameters<typeof listBlockLog>[0]['data']) => ({
  queryKey: ['admin', 'blocks', search],
  queryFn: () => listBlockLog({ data: search }),
})

const SOURCE_LABELS = { broadcast: 'Left out of alert', interest: 'Tried, was told no', selection: 'At selection' } as const

const columns: ColumnDef<Row, unknown>[] = [
  {
    id: 'createdAt',
    header: 'When',
    meta: { sortKey: 'createdAt' },
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        <RelativeTime date={row.original.createdAt} />
        <div className="text-xs text-muted-foreground tabular">{formatDateTime(row.original.createdAt)}</div>
      </div>
    ),
  },
  {
    id: 'worker',
    header: () => 'Worker',
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link to="/admin/workers/$userId" params={{ userId: row.original.workerId }} className="font-medium hover:underline">
          {row.original.workerName ?? 'Unknown'}
        </Link>
        {row.original.accountHandle ? (
          <div className="text-xs text-muted-foreground">{accountLabel(row.original.accountPlatform ?? 'reddit', row.original.accountHandle)}</div>
        ) : null}
      </div>
    ),
  },
  {
    id: 'gig',
    header: () => 'Opportunity',
    meta: { className: 'max-w-64 truncate' },
    cell: ({ row }) =>
      row.original.gigTitle ? (
        <Link to="/admin/gigs/$gigId" params={{ gigId: row.original.gigId }} className="hover:underline">
          {row.original.gigTitle}
        </Link>
      ) : (
        '—'
      ),
  },
  {
    id: 'rule',
    header: () => 'Rule',
    cell: ({ row }) => (
      <div>
        <span className="inline-flex h-5.5 items-center rounded-md bg-muted px-1.5 text-xs whitespace-nowrap">{RULE_LABELS[row.original.rule as RuleKey] ?? row.original.rule}</span>
        {row.original.detail ? <div className="mt-0.5 max-w-80 truncate text-xs text-muted-foreground">{row.original.detail}</div> : null}
      </div>
    ),
  },
  {
    id: 'unlock',
    header: () => 'Unlocks',
    cell: ({ row }) => (row.original.unlockAt ? formatDate(row.original.unlockAt) : <span className="text-muted-foreground">—</span>),
  },
  {
    id: 'source',
    header: () => 'Where',
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{SOURCE_LABELS[row.original.source]}</span>,
  },
]

export const Route = createFileRoute('/_app/admin/accounts/blocks')({
  head: () => ({ meta: [{ title: 'Block log · TinyGig Admin' }] }),
  validateSearch: blockLogSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(blockLogQuery(deps)),
  component: BlockLogPage,
})

function BlockLogPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useTableSearch(navigate as never)
  const { data, isFetching } = useQuery({ ...blockLogQuery(search), placeholderData: keepPreviousData })
  const byRule = [...(data?.byRule ?? [])].sort((a, b) => b.n - a.n)
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 text-muted-foreground">
          <Link to="/admin/accounts">
            <ArrowLeft /> Accounts
          </Link>
        </Button>
        <PageHeader title="Block log" description="Every time a cooldown kept someone out. Use it to see whether a limit is protecting accounts or just costing work." />
      </div>
      {byRule.length ? (
        <div className="flex flex-wrap gap-2">
          {byRule.map((r) => (
            <button
              key={r.rule}
              type="button"
              onClick={() => onSearchChange({ rule: [r.rule] })}
              className="rounded-lg border bg-card px-3 py-2 text-left hover:bg-accent/40"
            >
              <div className="text-xs text-muted-foreground">{RULE_LABELS[r.rule as RuleKey] ?? r.rule}</div>
              <div className="text-sm font-semibold tabular">
                {r.n} <span className="text-xs font-normal text-muted-foreground">· {r.workers} people · 30d</span>
              </div>
            </button>
          ))}
        </div>
      ) : null}
      <DataTable<Row>
        columns={columns}
        data={data}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(r) => r.id}
        isFetching={isFetching}
        searchPlaceholder="Search worker, account or gig…"
        hasActiveFilters={Boolean(search.rule || search.source || search.q)}
        onResetFilters={() => navigate({ search: {} })}
        filters={
          <>
            <DataTableFacetedFilter
              title="Rule"
              options={Object.entries(RULE_LABELS).map(([value, label]) => ({ value, label }))}
              value={search.rule}
              onChange={(v) => onSearchChange({ rule: v })}
            />
            <DataTableFacetedFilter
              title="Where"
              options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }))}
              value={search.source}
              onChange={(v) => onSearchChange({ source: v as never })}
            />
          </>
        }
        empty={<EmptyState icon={ShieldOff} title="No blocks recorded" description="Nothing matches these filters." className="border-0 bg-transparent" />}
      />
    </div>
  )
}
