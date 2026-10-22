import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Download, Plus, ShieldOff } from 'lucide-react'
import { useState } from 'react'
import { downloadCsv } from '@/components/data-table/csv'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { DataTableToggleFilter } from '@/components/data-table/data-table-toggle-filter'
import { useTableSearch } from '@/components/data-table/use-table-search'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { formatDate } from '@/components/shared/relative-time'
import { StatCard, StatGrid } from '@/components/shared/stat-card'
import { Button } from '@/components/ui/button'
import { ACCOUNT_PLATFORMS } from '@/db/schema/enums'
import { accountColumns } from '@/features/accounts/components/account-columns'
import { AccountSheet } from '@/features/accounts/components/account-sheet'
import { istDateInputToMs, STANDING_LABELS } from '@/features/accounts/components/account-editors'
import { AddAccountDialog, type AddAccountValues } from '@/features/accounts/components/add-account-dialog'
import { type PickedWorker, WorkerPicker } from '@/features/accounts/components/worker-picker'
import { rosterQuery } from '@/features/accounts/queries'
import { accountLabel, communityLabel, LEVEL_LABELS, LEVELS } from '@/features/accounts/rules'
import { adminAddAccount, type RosterRow, rosterSearchSchema } from '@/features/accounts/server/roster'
import { useAction } from '@/hooks/use-action'

const STANDING_OPTIONS = [
  ...Object.entries(STANDING_LABELS).map(([value, label]) => ({ value, label })),
  { value: 'cooling_down', label: 'Cooling down' },
]
const PLATFORM_LABEL: Record<string, string> = {
  reddit: 'Reddit',
  x: 'X',
  linkedin: 'LinkedIn',
  threads: 'Threads',
  instagram: 'Instagram',
  facebook: 'Facebook',
}

export const Route = createFileRoute('/_app/admin/accounts/')({
  head: () => ({ meta: [{ title: 'Accounts · TinyGig Admin' }] }),
  validateSearch: rosterSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(rosterQuery(deps)),
  component: AccountsPage,
})

function exportCsv(rows: RosterRow[]) {
  downloadCsv(`tinygig-accounts-${new Date().toISOString().slice(0, 10)}`, rows, [
    { header: 'Account', value: (r) => accountLabel(r.platform, r.handle) },
    { header: 'Profile', value: (r) => r.url },
    { header: 'Owner', value: (r) => r.ownerName ?? '' },
    { header: 'Phone', value: (r) => r.ownerPhone ?? '' },
    { header: 'Level', value: (r) => (r.level ? LEVEL_LABELS[r.level] : '') },
    { header: 'Created', value: (r) => (r.createdOn ? formatDate(r.createdOn) : '') },
    { header: 'Karma', value: (r) => r.karma ?? '' },
    { header: 'Karma checked', value: (r) => (r.karmaUpdatedAt ? formatDate(r.karmaUpdatedAt) : '') },
    { header: 'Standing', value: (r) => (r.cooling ? 'cooling down' : r.standing) },
    { header: 'In use', value: (r) => (r.inUse ? 'yes' : 'no') },
    { header: 'Last activity', value: (r) => (r.lastActivityAt ? formatDate(r.lastActivityAt) : '') },
    { header: 'Clients', value: (r) => r.clients.map((c) => c.name).join('; ') },
    { header: 'Last client', value: (r) => r.lastClient?.name ?? '' },
    { header: 'Days since client work', value: (r) => r.daysSinceClientWork ?? '' },
    { header: 'Communities', value: (r) => r.communities.map((c) => communityLabel(c.name)).join(' ') },
    { header: 'Tasks done', value: (r) => r.totalDone },
  ])
}

function AccountsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useTableSearch(navigate as never)
  const { data, isFetching } = useQuery({ ...rosterQuery(search), placeholderData: keepPreviousData })
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [worker, setWorker] = useState<PickedWorker | null>(null)
  const add = useAction(
    (v: AddAccountValues) =>
      adminAddAccount({
        data: {
          workerId: worker?.id ?? '',
          platform: v.platform,
          url: v.url,
          createdOn: v.createdOn ? istDateInputToMs(v.createdOn) : undefined,
          karma: v.karma === '' ? undefined : Number(v.karma),
        },
      }),
    {
      success: 'Account added',
      invalidate: [['admin', 'accounts'], ['admin', 'worker']],
      onSuccess: () => {
        setAdding(false)
        setWorker(null)
      },
    },
  )
  const s = data?.summary
  const filtered = Boolean(
    search.standing ||
      search.level ||
      search.platform ||
      search.client ||
      search.inUse ||
      search.free ||
      search.unconfirmed ||
      search.q ||
      search.workerId,
  )
  const only = (patch: Record<string, unknown>) => ({ platform: search.platform, ...patch })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="The live register: every account, its standing, and when it last worked."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsv(data?.rows ?? [])} disabled={!data?.rows.length}>
              <Download /> Export page
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/accounts/blocks">
                <ShieldOff /> Block log
              </Link>
            </Button>
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus /> Add account
            </Button>
          </div>
        }
      />

      <StatGrid className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total accounts" value={s?.total ?? '—'} to="/admin/accounts" search={only({})} />
        <StatCard label="Active" value={s?.active ?? '—'} to="/admin/accounts" search={only({ standing: ['active'] })} />
        <StatCard
          label="Cooling down"
          value={s?.cooling ?? '—'}
          to="/admin/accounts"
          search={only({ standing: ['cooling_down'] })}
        />
        <StatCard label="In use now" value={s?.inUse ?? '—'} to="/admin/accounts" search={only({ inUse: true })} />
        <StatCard
          label="Warned"
          value={s?.warned ?? '—'}
          to="/admin/accounts"
          search={only({ standing: ['warned'] })}
          tone={s?.warned ? 'attention' : 'default'}
        />
        <StatCard
          label="Banned / lost"
          value={s?.lost ?? '—'}
          to="/admin/accounts"
          search={only({ standing: ['banned', 'lost'] })}
        />
      </StatGrid>

      <DataTable<RosterRow>
        columns={accountColumns}
        data={data}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(r) => r.id}
        isFetching={isFetching}
        searchPlaceholder="Search handle, owner or phone…"
        onRowClick={(r) => setOpen(r.id)}
        activeRowId={open ?? undefined}
        hasActiveFilters={filtered}
        onResetFilters={() => navigate({ search: {} })}
        initialHidden={{ communities: false }}
        filters={
          <>
            <DataTableToggleFilter
              active={!!search.free}
              count={s?.free}
              onToggle={() => onSearchChange({ free: search.free ? undefined : true })}
            >
              Free right now
            </DataTableToggleFilter>
            <DataTableFacetedFilter
              title="Standing"
              options={STANDING_OPTIONS}
              value={search.standing}
              onChange={(v) => onSearchChange({ standing: v })}
            />
            <DataTableFacetedFilter
              title="Level"
              options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABELS[l] }))}
              value={search.level}
              onChange={(v) => onSearchChange({ level: v })}
            />
            <DataTableFacetedFilter
              title="Client"
              options={(data?.tags ?? []).map((t) => ({ value: t.id, label: t.name }))}
              value={search.client}
              onChange={(v) => onSearchChange({ client: v })}
            />
            <DataTableFacetedFilter
              title="Platform"
              options={ACCOUNT_PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABEL[p] ?? p }))}
              value={search.platform}
              onChange={(v) => onSearchChange({ platform: v })}
            />
            {s?.unconfirmed ? (
              <DataTableToggleFilter
                active={!!search.unconfirmed}
                count={s.unconfirmed}
                onToggle={() => onSearchChange({ unconfirmed: search.unconfirmed ? undefined : true })}
              >
                Unconfirmed dates
              </DataTableToggleFilter>
            ) : null}
          </>
        }
        empty={
          filtered ? (
            <EmptyState
              title="No accounts match"
              description="Nothing in the register fits these filters. Press Reset to see every account."
              className="border-0 bg-transparent"
            />
          ) : (
            <EmptyState
              title="The register is empty"
              description="Accounts appear here when workers add them, or when you use Add account."
              action={
                <Button size="sm" onClick={() => setAdding(true)}>
                  <Plus /> Add account
                </Button>
              }
              className="border-0 bg-transparent"
            />
          )
        }
      />
      <AccountSheet accountId={open} onOpenChange={(o) => !o && setOpen(null)} />
      <AddAccountDialog
        open={adding}
        onOpenChange={(o) => {
          setAdding(o)
          if (!o) setWorker(null)
        }}
        title="Add an account to the register"
        description="For accounts a worker uses but never recorded. Creation dates you enter count as confirmed."
        pending={add.isPending}
        onSubmit={(v) => (worker ? add.mutate(v) : undefined)}
        extra={<WorkerPicker value={worker} onChange={setWorker} />}
        canSubmit={!!worker}
      />
    </div>
  )
}
