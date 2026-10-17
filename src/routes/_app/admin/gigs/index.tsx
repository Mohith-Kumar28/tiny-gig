import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Briefcase, Pause, Plus, Send, Square } from 'lucide-react'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { useTableSearch } from '@/components/data-table/use-table-search'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { PLATFORM_LABELS, PlatformIcon } from '@/components/shared/platform-icon'
import { Button } from '@/components/ui/button'
import { PLATFORMS, TASK_TYPES } from '@/db/schema/enums'
import { useGigStatus } from '@/features/gigs/components/gig-actions'
import { type GigRow, gigColumns } from '@/features/gigs/components/gig-columns'
import { TASK_TYPE_LABELS } from '@/features/gigs/components/worker-gig-meta'
import { gigsQuery } from '@/features/gigs/queries'
import { gigsSearchSchema } from '@/features/gigs/server/admin-gigs'

const STATUS_OPTIONS = [
  { label: 'Live', value: 'live' },
  { label: 'Draft', value: 'draft' },
  { label: 'Paused', value: 'paused' },
  { label: 'Closed', value: 'closed' },
]
const PLATFORM_OPTIONS = PLATFORMS.map((p) => ({
  label: PLATFORM_LABELS[p],
  value: p,
  icon: ({ className }: { className?: string }) => <PlatformIcon platform={p} className={className} />,
}))
const TASK_OPTIONS = TASK_TYPES.map((t) => ({ label: TASK_TYPE_LABELS[t], value: t }))

export const Route = createFileRoute('/_app/admin/gigs/')({
  head: () => ({ meta: [{ title: 'Gigs · TinyGig Admin' }] }),
  validateSearch: gigsSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(gigsQuery(deps)),
  component: GigsPage,
})

function GigsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useTableSearch(navigate as never)
  const { data, isFetching } = useQuery({ ...gigsQuery(search), placeholderData: keepPreviousData })
  const setStatus = useGigStatus()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gigs"
        description="Every task you've posted. Click a gig to see its submissions and spend."
        actions={
          <Button asChild>
            <Link to="/admin/gigs/new">
              <Plus /> New gig
            </Link>
          </Button>
        }
      />
      <DataTable<GigRow>
        columns={gigColumns}
        data={data}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(r) => r.id}
        isFetching={isFetching}
        searchPlaceholder="Search title or community…"
        onRowClick={(r) => navigate({ to: '/admin/gigs/$gigId', params: { gigId: r.id } })}
        hasActiveFilters={Boolean(search.status || search.platform || search.taskType || search.q)}
        onResetFilters={() => navigate({ search: {} })}
        initialHidden={{ liveHold: false, createdAt: false }}
        filters={
          <>
            <DataTableFacetedFilter title="Status" options={STATUS_OPTIONS} value={search.status} onChange={(v) => onSearchChange({ status: v })} />
            <DataTableFacetedFilter title="Platform" options={PLATFORM_OPTIONS} value={search.platform} onChange={(v) => onSearchChange({ platform: v })} />
            <DataTableFacetedFilter title="Task" options={TASK_OPTIONS} value={search.taskType} onChange={(v) => onSearchChange({ taskType: v })} />
          </>
        }
        empty={
          <EmptyState
            icon={Briefcase}
            title="No gigs here"
            description="Create a gig and publish it to start getting submissions."
            className="border-0 bg-transparent"
            action={
              <Button asChild size="sm">
                <Link to="/admin/gigs/new">
                  <Plus /> New gig
                </Link>
              </Button>
            }
          />
        }
        bulkActions={(rows, clear) => {
          const ids = rows.map((r) => r.id)
          const run = (status: 'live' | 'paused' | 'closed') => setStatus.mutate({ ids, status }, { onSuccess: clear })
          return (
            <>
              <Button size="sm" disabled={setStatus.isPending} onClick={() => run('live')}>
                <Send /> Publish
              </Button>
              <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => run('paused')}>
                <Pause /> Pause
              </Button>
              <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => run('closed')}>
                <Square /> Close
              </Button>
            </>
          )
        }}
      />
    </div>
  )
}
