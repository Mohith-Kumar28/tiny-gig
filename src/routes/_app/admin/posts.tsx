import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Newspaper } from 'lucide-react'
import { useState } from 'react'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { useTableSearch } from '@/components/data-table/use-table-search'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { PLATFORM_LABELS } from '@/components/shared/platform-icon'
import { PLATFORMS, SUBMISSION_STATUSES } from '@/db/schema/enums'
import { postLogColumns, SUBMISSION_STATUS_OPTIONS } from '@/features/gigs/components/submission-columns'
import type { QueueRow } from '@/features/submissions/components/review-queue-item'
import { SubmissionReviewSheet } from '@/features/submissions/components/submission-review-sheet'
import { reviewQueueQuery } from '@/features/submissions/queries'
import { facet, tableSearchSchema } from '@/lib/table-query'

const searchSchema = tableSearchSchema.extend({ status: facet(SUBMISSION_STATUSES), platform: facet(PLATFORMS) })

// A posted submission is never "in progress" again, so that facet would always be empty.
const STATUS_OPTIONS = SUBMISSION_STATUS_OPTIONS.filter((o) => o.value !== 'claimed')
const PLATFORM_OPTIONS = PLATFORMS.map((p) => ({ label: PLATFORM_LABELS[p], value: p }))

const postLogSearch = (search: typeof searchSchema._output) => ({
  ...search,
  tab: 'all' as const,
  posted: true,
  perPage: search.perPage ?? 20,
})

export const Route = createFileRoute('/_app/admin/posts')({
  head: () => ({ meta: [{ title: 'Post log · TinyGig Admin' }] }),
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(reviewQueueQuery(postLogSearch(deps))),
  component: PostLogPage,
})

function PostLogPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useTableSearch(navigate as never)
  const { data, isFetching } = useQuery({ ...reviewQueueQuery(postLogSearch(search)), placeholderData: keepPreviousData })
  const [openSubmission, setOpenSubmission] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <PageHeader title="Post log" />
      <DataTable<QueueRow>
        columns={postLogColumns}
        data={data}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(r) => r.id}
        isFetching={isFetching}
        searchPlaceholder="Search gig, worker, post link…"
        onRowClick={(r) => setOpenSubmission(r.id)}
        activeRowId={openSubmission ?? undefined}
        hasActiveFilters={Boolean(search.status || search.platform || search.q)}
        onResetFilters={() => navigate({ search: {} })}
        filters={
          <>
            <DataTableFacetedFilter
              title="Status"
              options={STATUS_OPTIONS}
              value={search.status}
              onChange={(v) => onSearchChange({ status: v })}
            />
            <DataTableFacetedFilter
              title="Platform"
              options={PLATFORM_OPTIONS}
              value={search.platform}
              onChange={(v) => onSearchChange({ platform: v })}
            />
          </>
        }
        empty={
          <EmptyState
            icon={Newspaper}
            title="No posts"
            description="Nothing matches these filters."
            className="border-0 bg-transparent"
          />
        }
      />
      <SubmissionReviewSheet submissionId={openSubmission} onOpenChange={(o) => !o && setOpenSubmission(null)} />
    </div>
  )
}
