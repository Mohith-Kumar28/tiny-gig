import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Ban, Download, RotateCcw, Users } from 'lucide-react'
import { useState } from 'react'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { useTableSearch } from '@/components/data-table/use-table-search'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { INDIAN_STATES } from '@/db/schema/enums'
import { DecisionDialog } from '@/features/workers/components/decision-dialog'
import { type WorkerRow, workerColumns } from '@/features/workers/components/worker-columns'
import { exportWorkersCsv } from '@/features/workers/components/worker-csv'
import { workersQuery, workerStatusCountsQuery } from '@/features/workers/queries'
import { setWorkerStatus, workersSearchSchema } from '@/features/workers/server/admin-workers'
import { useAction } from '@/hooks/use-action'

const STATUS_OPTIONS = [
  { label: 'Approved', value: 'approved' },
  { label: 'Pending', value: 'pending' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Draft', value: 'draft' },
]

export const Route = createFileRoute('/_app/admin/workers/')({
  head: () => ({ meta: [{ title: 'Workers · TinyGig Admin' }] }),
  validateSearch: workersSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(workersQuery(deps)),
  component: WorkersPage,
})

type Bulk = { status: 'suspended' | 'approved'; rows: WorkerRow[]; clear: () => void }

function WorkersPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useTableSearch(navigate as never)
  const { data, isFetching } = useQuery({ ...workersQuery(search), placeholderData: keepPreviousData })
  const { data: counts } = useQuery(workerStatusCountsQuery())
  const [suspending, setSuspending] = useState<Bulk | null>(null)

  const bulkStatus = useAction(
    async (v: Bulk & { note?: string }) => {
      for (const r of v.rows) await setWorkerStatus({ data: { userId: r.userId, status: v.status, note: v.note } })
      return v.rows.length
    },
    {
      success: (n, v) => `${n} worker${n === 1 ? '' : 's'} ${v.status === 'suspended' ? 'suspended' : 'reactivated'}`,
      invalidate: [['admin']],
      onSuccess: (_n, v) => {
        v.clear()
        setSuspending(null)
      },
    },
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workers"
        actions={
          <Button variant="outline" size="sm" onClick={() => exportWorkersCsv(data?.rows ?? [])} disabled={!data?.rows.length}>
            <Download /> Export page
          </Button>
        }
      />
      <DataTable<WorkerRow>
        columns={workerColumns}
        data={data}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(r) => r.userId}
        isFetching={isFetching}
        searchPlaceholder="Search name, email, Reddit, phone, UPI…"
        onRowClick={(r) => navigate({ to: '/admin/workers/$userId', params: { userId: r.userId } })}
        hasActiveFilters={Boolean(search.status || search.state || search.q || search.flagged)}
        onResetFilters={() => navigate({ search: {} })}
        initialHidden={{ age: false }}
        filters={
          <>
            <DataTableFacetedFilter
              title="Status"
              options={STATUS_OPTIONS}
              value={search.status}
              counts={counts}
              onChange={(v) => onSearchChange({ status: v })}
            />
            <DataTableFacetedFilter
              title="State"
              options={INDIAN_STATES.map((s) => ({ label: s, value: s }))}
              value={search.state}
              onChange={(v) => onSearchChange({ state: v })}
            />
            <Button
              variant={search.flagged ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 border-dashed"
              onClick={() => onSearchChange({ flagged: search.flagged ? undefined : true })}
            >
              Flagged referrals
            </Button>
          </>
        }
        empty={<EmptyState icon={Users} title="No workers match" description="Try clearing a filter or the search." className="border-0 bg-transparent" />}
        bulkActions={(rows, clear) => (
          <>
            <Button size="sm" variant="outline" onClick={() => exportWorkersCsv(rows)}>
              <Download /> CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkStatus.isPending}
              onClick={() => bulkStatus.mutate({ status: 'approved', rows, clear })}
            >
              <RotateCcw /> Reactivate
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setSuspending({ status: 'suspended', rows, clear })}>
              <Ban /> Suspend
            </Button>
          </>
        )}
      />
      <DecisionDialog
        open={!!suspending}
        onOpenChange={(o) => !o && setSuspending(null)}
        title={`Suspend ${suspending?.rows.length ?? 0} worker${suspending?.rows.length === 1 ? '' : 's'}?`}
        description="Suspended workers can't claim new gigs. Their existing approved earnings are still payable."
        confirmLabel="Suspend"
        templateKind="applicant_reject"
        required={false}
        destructive
        pending={bulkStatus.isPending}
        onConfirm={(note) => suspending && bulkStatus.mutate({ ...suspending, note: note || undefined })}
      />
    </div>
  )
}
