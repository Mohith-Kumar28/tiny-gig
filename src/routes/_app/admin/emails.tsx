import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Mail } from 'lucide-react'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { useTableSearch } from '@/components/data-table/use-table-search'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { type EmailRow, emailColumns, templateLabel } from '@/features/emails/components/email-columns'
import { emailLogQuery } from '@/features/emails/queries'
import { emailLogSearchSchema } from '@/features/emails/server/email-log'

const STATUS_OPTIONS = [
  { label: 'Sent', value: 'sent' },
  { label: 'Failed', value: 'failed' },
  { label: 'Logged (dev)', value: 'logged' },
]

export const Route = createFileRoute('/_app/admin/emails')({
  head: () => ({ meta: [{ title: 'Email log · TinyGig Admin' }] }),
  validateSearch: emailLogSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(emailLogQuery(deps)),
  component: EmailLogPage,
})

function EmailLogPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useTableSearch(navigate as never)
  const { data, isFetching } = useQuery({ ...emailLogQuery(search), placeholderData: keepPreviousData })
  const templates = [...new Set([...(data?.templates ?? []), ...(search.template ?? [])])].sort()

  return (
    <div className="space-y-6">
      <PageHeader title="Email log" description="Every email TinyGig has sent or tried to send. Hover a failed status to see the error." />
      <DataTable<EmailRow>
        columns={emailColumns}
        data={data}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(r) => r.id}
        isFetching={isFetching}
        searchPlaceholder="Search recipient or subject…"
        hasActiveFilters={Boolean(search.status || search.template || search.q)}
        onResetFilters={() => navigate({ search: {} })}
        filters={
          <>
            <DataTableFacetedFilter title="Status" options={STATUS_OPTIONS} value={search.status} onChange={(v) => onSearchChange({ status: v })} />
            <DataTableFacetedFilter
              title="Template"
              options={templates.map((t) => ({ label: templateLabel(t), value: t }))}
              value={search.template}
              onChange={(v) => onSearchChange({ template: v })}
            />
          </>
        }
        empty={<EmptyState icon={Mail} title="No emails" description="Nothing matches these filters." className="border-0 bg-transparent" />}
      />
    </div>
  )
}
