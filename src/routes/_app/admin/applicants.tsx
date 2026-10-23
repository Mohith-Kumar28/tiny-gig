import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { DataTableToggleFilter } from '@/components/data-table/data-table-toggle-filter'
import { useTableSearch } from '@/components/data-table/use-table-search'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { INDIAN_STATES } from '@/db/schema/enums'
import { ApplicantSheet } from '@/features/workers/components/applicant-sheet'
import { DecisionDialog } from '@/features/workers/components/decision-dialog'
import { applicantColumns, type WorkerRow } from '@/features/workers/components/worker-columns'
import { workersQuery, workerStatusCountsQuery } from '@/features/workers/queries'
import { decideApplicants, workersSearchSchema } from '@/features/workers/server/admin-workers'
import { useAction } from '@/hooks/use-action'
import { useRowPager } from '@/hooks/use-row-pager'

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Approved', value: 'approved' },
]

export const Route = createFileRoute('/_app/admin/applicants')({
  head: () => ({ meta: [{ title: 'Applicants · TinyGig Admin' }] }),
  validateSearch: workersSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(workersQuery({ ...deps, status: deps.status ?? ['pending'] })),
  component: ApplicantsPage,
})

function ApplicantsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useTableSearch(navigate as never)
  const effective = { ...search, status: search.status ?? (['pending'] as const).slice() }
  const { data, isFetching } = useQuery({ ...workersQuery(effective), placeholderData: keepPreviousData })
  const { data: counts } = useQuery(workerStatusCountsQuery())
  const [openId, setOpenId] = useState<string | null>(null)
  const [bulkReject, setBulkReject] = useState<{ ids: string[]; clear: () => void } | null>(null)

  const decide = useAction(
    (v: { userIds: string[]; decision: 'approve' | 'reject'; note?: string }) => decideApplicants({ data: v }),
    {
      success: (r, v) => `${r.updated} applicant${r.updated === 1 ? '' : 's'} ${v.decision === 'approve' ? 'approved' : 'rejected'}`,
      invalidate: [['admin']],
      onSuccess: () => {
        bulkReject?.clear()
        setBulkReject(null)
      },
    },
  )

  const pager = useRowPager(data?.rows, (r) => r.userId, openId, (r) => setOpenId(r?.userId ?? null))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applicants"
        description="New sign-ups waiting for a decision. Open one to check their Reddit account, then approve or reject. Either way they get an email."
      />
      <DataTable<WorkerRow>
        columns={applicantColumns}
        data={data}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(r) => r.userId}
        isFetching={isFetching}
        searchPlaceholder="Search name, email, Reddit, phone, UPI…"
        onRowClick={(r) => setOpenId(r.userId)}
        activeRowId={openId ?? undefined}
        hasActiveFilters={Boolean(search.status || search.state || search.q || search.flagged)}
        onResetFilters={() => navigate({ search: {} })}
        filters={
          <>
            <DataTableFacetedFilter
              title="Status"
              options={STATUS_OPTIONS}
              value={effective.status}
              counts={counts}
              onChange={(v) => onSearchChange({ status: v })}
            />
            <DataTableFacetedFilter
              title="State"
              options={INDIAN_STATES.map((s) => ({ label: s, value: s }))}
              value={search.state}
              onChange={(v) => onSearchChange({ state: v })}
            />
            <DataTableToggleFilter
              active={!!search.flagged}
              onToggle={() => onSearchChange({ flagged: search.flagged ? undefined : true })}
            >
              Flagged referrals
            </DataTableToggleFilter>
          </>
        }
        empty={
          search.status || search.state || search.q || search.flagged ? (
            <EmptyState
              title="No applicants match"
              description="Nothing fits these filters. Press Reset to go back to everyone pending."
              className="border-0 bg-transparent"
            />
          ) : (
            <EmptyState
              title="No one is waiting"
              description="New applications land here as soon as someone signs up. Share a worker's referral link to bring more in."
              className="border-0 bg-transparent"
            />
          )
        }
        bulkActions={(rows, clear) => (
          <>
            <Button
              size="sm"
              onClick={() => decide.mutate({ userIds: rows.map((r) => r.userId), decision: 'approve' }, { onSuccess: clear })}
              disabled={decide.isPending}
            >
              <Check /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkReject({ ids: rows.map((r) => r.userId), clear })}>
              <X /> Reject
            </Button>
          </>
        )}
      />
      <ApplicantSheet userId={openId} onOpenChange={(o) => !o && setOpenId(null)} pager={pager} />
      <DecisionDialog
        open={!!bulkReject}
        onOpenChange={(o) => !o && setBulkReject(null)}
        title={`Reject ${bulkReject?.ids.length ?? 0} applicants?`}
        description="Each applicant gets an email with this reason."
        confirmLabel="Reject all"
        templateKind="applicant_reject"
        destructive
        pending={decide.isPending}
        onConfirm={(note) => bulkReject && decide.mutate({ userIds: bulkReject.ids, decision: 'reject', note })}
      />
    </div>
  )
}
