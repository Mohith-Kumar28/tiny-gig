import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { CheckCheck, Clock, Download, HandCoins } from 'lucide-react'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { useTableSearch } from '@/components/data-table/use-table-search'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard, StatGrid } from '@/components/shared/stat-card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreatePayoutsDialog } from '@/features/payouts/components/create-payouts-dialog'
import { MarkPaidDialog } from '@/features/payouts/components/mark-paid-dialog'
import {
  type BalanceRow,
  balanceColumns,
  exportUpiCsv,
  type PayoutRow,
  payoutColumns,
} from '@/features/payouts/components/payout-columns'
import { useRowPager } from '@/hooks/use-row-pager'
import { PayoutSheet } from '@/features/payouts/components/payout-sheet'
import { payableBalancesQuery, payoutsQuery } from '@/features/payouts/queries'
import { createPayouts, payoutsSearchSchema, setPayoutStatus } from '@/features/payouts/server/payouts'
import { useAction } from '@/hooks/use-action'
import { formatMoney, formatNumber } from '@/lib/format'
import { DEFAULT_PER_PAGE, paginated } from '@/lib/table-query'

const TABS = ['to_pay', 'payouts'] as const
type Tab = (typeof TABS)[number]
const DEFAULT_STATUS: ('pending' | 'processing')[] = ['pending', 'processing']

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Paid', value: 'paid' },
  { label: 'Failed', value: 'failed' },
]

const searchSchema = payoutsSearchSchema.extend({ tab: z.enum(TABS).optional().catch(undefined) })

export const Route = createFileRoute('/_app/admin/payouts')({
  head: () => ({ meta: [{ title: 'Payouts · TinyGig Admin' }] }),
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    const { tab, ...rest } = deps
    return tab === 'payouts'
      ? context.queryClient.ensureQueryData(payoutsQuery({ ...rest, status: rest.status ?? DEFAULT_STATUS }))
      : context.queryClient.ensureQueryData(payableBalancesQuery())
  },
  component: PayoutsPage,
})

function PayoutsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const tab: Tab = search.tab ?? 'to_pay'
  const { data: balances } = useQuery(payableBalancesQuery())
  const toPayTotal = (balances ?? []).reduce((s, b) => s + b.total, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payouts"
        description="Workers are paid weekly over UPI. Lock balances into payouts on To pay, send the money, then mark each payout paid with its UTR."
      />
      <Tabs value={tab} onValueChange={(v) => navigate({ search: v === 'to_pay' ? {} : { tab: v as Tab }, replace: true })}>
        <TabsList>
          <TabsTrigger value="to_pay">
            To pay
            {balances?.length ? (
              <span className="ml-1 rounded-md bg-muted px-1 text-xs text-muted-foreground tabular">{balances.length}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'to_pay' ? <ToPay rows={balances} total={toPayTotal} /> : <PayoutList />}
    </div>
  )
}

function sortBalances(rows: BalanceRow[], sort: string | undefined) {
  const [field, dir] = (sort ?? 'total.desc').split('.')
  const get: Record<string, (r: BalanceRow) => number | string> = {
    worker: (r) => r.fullName.toLowerCase(),
    gigs: (r) => r.gigAmount,
    rewards: (r) => r.rewardAmount,
    total: (r) => r.total,
  }
  const fn = get[field ?? 'total'] ?? get.total!
  const mul = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = fn(a)
    const y = fn(b)
    return x < y ? -mul : x > y ? mul : 0
  })
}

function ToPay({ rows, total }: { rows: BalanceRow[] | undefined; total: number }) {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useTableSearch(navigate as never)
  const [creating, setCreating] = useState<{ rows: BalanceRow[]; clear: () => void } | null>(null)

  // Balances come back in one list; search / sort / paging happen here.
  const data = useMemo(() => {
    if (!rows) return undefined
    const q = search.q?.toLowerCase()
    const filtered = q
      ? rows.filter((r) => r.fullName.toLowerCase().includes(q) || r.upiId.toLowerCase().includes(q) || r.phone.includes(q))
      : rows
    const sorted = sortBalances(filtered, search.sort)
    const perPage = search.perPage ?? 50
    const page = Math.min(search.page ?? 1, Math.max(1, Math.ceil(sorted.length / perPage)))
    return paginated(sorted.slice((page - 1) * perPage, page * perPage), sorted.length, page, perPage)
  }, [rows, search.q, search.sort, search.page, search.perPage])

  const create = useAction((v: { workerIds: string[]; note?: string }) => createPayouts({ data: v }), {
    success: (r) => `${r.created} payout${r.created === 1 ? '' : 's'} created · now pay them over UPI`,
    invalidate: [['admin']],
    onSuccess: () => {
      creating?.clear()
      setCreating(null)
      navigate({ search: { tab: 'payouts' }, replace: true })
    },
  })

  return (
    <div className="space-y-4">
      <StatGrid className="grid-cols-2 lg:grid-cols-4">
        <StatCard label="Owed to workers" value={<Money paise={total} className="font-bold" />} hint="Approved, not yet in a payout" />
        <StatCard label="Workers to pay" value={formatNumber(rows?.length ?? 0)} />
        <StatCard
          label="From gigs"
          value={<Money paise={(rows ?? []).reduce((s, r) => s + r.gigAmount, 0)} className="font-bold" />}
          hint={`${formatNumber((rows ?? []).reduce((s, r) => s + r.gigCount, 0))} approved gigs`}
        />
        <StatCard
          label="From referrals"
          value={<Money paise={(rows ?? []).reduce((s, r) => s + r.rewardAmount, 0)} className="font-bold" />}
          hint={`${formatNumber((rows ?? []).reduce((s, r) => s + r.rewardCount, 0))} rewards`}
        />
      </StatGrid>
      <DataTable<BalanceRow>
        columns={balanceColumns}
        data={data}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(r) => r.userId}
        searchPlaceholder="Search worker, phone or UPI…"
        hasActiveFilters={Boolean(search.q)}
        onResetFilters={() => onSearchChange({ q: undefined })}
        toolbarActions={
          rows?.length ? (
            <Button size="sm" onClick={() => setCreating({ rows, clear: () => {} })}>
              <HandCoins /> Create payouts for all ({rows.length})
            </Button>
          ) : null
        }
        empty={
          search.q ? (
            <EmptyState
              title="No one matches"
              description="No worker with money owed fits this search. Press Reset to see everyone."
              className="border-0 bg-transparent"
            />
          ) : (
            <EmptyState
              title="Nothing to pay"
              description="Everyone is settled. When you approve gigs or referral rewards, the money owed lands here, one row per worker."
              className="border-0 bg-transparent"
            />
          )
        }
        bulkActions={(sel, clear) => (
          <Button size="sm" onClick={() => setCreating({ rows: sel, clear })}>
            <HandCoins /> Create payouts · {formatMoney(sel.reduce((s, r) => s + r.total, 0))}
          </Button>
        )}
      />
      <CreatePayoutsDialog
        rows={creating?.rows ?? null}
        pending={create.isPending}
        onOpenChange={(o) => !o && setCreating(null)}
        onConfirm={(note) => creating && create.mutate({ workerIds: creating.rows.map((r) => r.userId), note })}
      />
    </div>
  )
}

function PayoutList() {
  const { tab: _tab, ...search } = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useTableSearch(navigate as never)
  const effective = { ...search, status: search.status ?? DEFAULT_STATUS, perPage: search.perPage ?? DEFAULT_PER_PAGE }
  const { data, isFetching } = useQuery({ ...payoutsQuery(effective), placeholderData: keepPreviousData })
  const [open, setOpen] = useState<PayoutRow | null>(null)
  const [paying, setPaying] = useState<{ rows: PayoutRow[]; clear?: () => void; fromSheet?: boolean } | null>(null)
  const pager = useRowPager(data?.rows, (r) => r.id, open?.id ?? null, setOpen)

  const processing = useAction(
    async (rows: PayoutRow[]) => {
      const targets = rows.filter((r) => r.status === 'pending')
      for (const r of targets) await setPayoutStatus({ data: { id: r.id, status: 'processing' } })
      return targets.length
    },
    { success: (n) => `${n} payout${n === 1 ? '' : 's'} marked processing`, invalidate: [['admin']] },
  )

  return (
    <div className="space-y-4">
      <StatGrid className="grid-cols-2 lg:grid-cols-3">
        <StatCard label="Not paid yet" value={<Money paise={data?.sums.pending ?? 0} className="font-bold" />} hint="Pending and processing" />
        <StatCard
          label="Paid to date"
          value={
            <span className="ledger-total">
              <Money paise={data?.sums.paid ?? 0} className="font-bold" />
            </span>
          }
          tone="success"
        />
        <StatCard
          label="In this list"
          value={data ? formatNumber(data.total) : '—'}
          hint="Payouts matching the filters below"
          className="col-span-2 lg:col-span-1"
        />
      </StatGrid>
      <DataTable<PayoutRow>
        columns={payoutColumns}
        data={data}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(r) => r.id}
        isFetching={isFetching}
        searchPlaceholder="Search worker, UPI or UTR…"
        onRowClick={setOpen}
        activeRowId={open?.id}
        initialHidden={{ note: false, items: false }}
        hasActiveFilters={Boolean(search.status || search.q)}
        onResetFilters={() => navigate({ search: { tab: 'payouts' }, replace: true })}
        filters={
          <DataTableFacetedFilter
            title="Status"
            options={STATUS_OPTIONS}
            value={effective.status}
            onChange={(v) => onSearchChange({ status: v })}
          />
        }
        toolbarActions={
          <Button size="sm" variant="outline" onClick={() => exportUpiCsv(data?.rows ?? [])} disabled={!data?.rows.length}>
            <Download /> Export page
          </Button>
        }
        empty={
          <EmptyState
            title="No payouts here"
            description={
              search.status || search.q
                ? 'Nothing fits these filters. Press Reset to see payouts still to be paid.'
                : 'Nothing is waiting to be paid. Create payouts from the To pay tab, then pay them over UPI.'
            }
            className="border-0 bg-transparent"
          />
        }
        bulkActions={(rows, clear) => {
          const unpaid = rows.filter((r) => r.status !== 'paid' && r.status !== 'failed')
          return (
            <>
              <Button size="sm" variant="outline" onClick={() => exportUpiCsv(rows)}>
                <Download /> Export UPI CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={processing.isPending || !rows.some((r) => r.status === 'pending')}
                onClick={() => processing.mutate(rows, { onSuccess: clear })}
              >
                <Clock /> Mark processing
              </Button>
              <Button size="sm" disabled={!unpaid.length} onClick={() => setPaying({ rows: unpaid, clear })}>
                <CheckCheck /> Mark paid{unpaid.length !== rows.length ? ` (${unpaid.length})` : ''}
              </Button>
            </>
          )
        }}
      />
      <PayoutSheet
        payout={open}
        onOpenChange={(o) => !o && setOpen(null)}
        onMarkPaid={(p) => setPaying({ rows: [p], fromSheet: true })}
        pager={pager}
      />
      <MarkPaidDialog
        payouts={paying?.rows ?? null}
        onOpenChange={(o) => !o && setPaying(null)}
        onDone={() => {
          paying?.clear?.()
          // Paid from the sheet: carry on with the next payout instead of closing.
          if (paying?.fromSheet) pager.advance()
        }}
      />
    </div>
  )
}
