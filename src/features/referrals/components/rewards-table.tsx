import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Ban, Check, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { downloadCsv } from '@/components/data-table/csv'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import type { OnSearchChange } from '@/components/data-table/types'
import { EmptyState } from '@/components/shared/empty-state'
import { statusLabel } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { REWARD_ROLES, REWARD_STATUSES } from '@/db/schema/enums'
import { useAction } from '@/hooks/use-action'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { programsQuery, rewardsQuery } from '../queries'
import { decideRewards, type RewardsSearch } from '../server/referrals'
import { NoteDialog } from './note-dialog'
import { type RewardRow, rewardColumns } from './reward-columns'

const STATUS_OPTIONS = REWARD_STATUSES.map((s) => ({ label: statusLabel(s), value: s }))
const ROLE_OPTIONS = REWARD_ROLES.map((r) => ({ label: r === 'referrer' ? 'Referrer' : 'Referee', value: r }))
const ALL = '__all'

/** Rewards review queue: approve or void referral rewards, one at a time or in bulk. */
export function RewardsTable({
  search,
  onSearchChange,
  hasActiveFilters,
  onReset,
}: {
  /** Effective search (status already defaulted). */
  search: RewardsSearch
  onSearchChange: OnSearchChange
  hasActiveFilters: boolean
  onReset: () => void
}) {
  const { data, isFetching } = useQuery({ ...rewardsQuery(search), placeholderData: keepPreviousData })
  const { data: programs } = useQuery(programsQuery())
  const [voiding, setVoiding] = useState<{ ids: string[]; clear?: () => void } | null>(null)

  const decide = useAction((v: { ids: string[]; decision: 'approve' | 'void'; note?: string }) => decideRewards({ data: v }), {
    success: (r, v) => `${r.updated} reward${r.updated === 1 ? '' : 's'} ${v.decision === 'approve' ? 'approved' : 'voided'}`,
    invalidate: [['admin']],
    onSuccess: () => {
      voiding?.clear?.()
      setVoiding(null)
    },
  })

  const columns = useMemo(
    () =>
      rewardColumns({
        onApprove: (r) => decide.mutate({ ids: [r.id], decision: 'approve' }),
        onVoid: (r) => setVoiding({ ids: [r.id] }),
      }),
    // decide.mutate is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const exportCsv = () =>
    downloadCsv('referral-rewards', data?.rows ?? [], [
      { header: 'Worker', value: (r) => r.workerName },
      { header: 'Program', value: (r) => r.programName },
      { header: 'Role', value: (r) => r.role },
      { header: 'Tier', value: (r) => r.tier },
      { header: 'Amount (INR)', value: (r) => r.amount / 100 },
      { header: 'Status', value: (r) => r.status },
      { header: 'Created', value: (r) => new Date(r.createdAt).toISOString() },
    ])

  const selectedTotal = (rows: RewardRow[]) => formatMoney(rows.reduce((s, r) => s + r.amount, 0))

  return (
    <>
      <DataTable<RewardRow>
        columns={columns}
        data={data}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(r) => r.id}
        isFetching={isFetching}
        searchPlaceholder="Search worker…"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={onReset}
        filters={
          <>
            <DataTableFacetedFilter title="Status" options={STATUS_OPTIONS} value={search.status} onChange={(v) => onSearchChange({ status: v })} />
            <DataTableFacetedFilter title="Role" options={ROLE_OPTIONS} value={search.role} onChange={(v) => onSearchChange({ role: v })} />
            <Select value={search.programId ?? ALL} onValueChange={(v) => onSearchChange({ programId: v === ALL ? undefined : v })}>
              <SelectTrigger
                size="sm"
                className={cn(
                  'h-8 w-auto min-w-36',
                  search.programId ? 'border-ink/40 bg-ink/[0.04]' : 'border-dashed text-muted-foreground',
                )}
              >
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All programs</SelectItem>
                {(programs ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        toolbarActions={
          <Button variant="outline" size="sm" className="h-8" onClick={exportCsv} disabled={!data?.rows.length}>
            <Download /> CSV
          </Button>
        }
        empty={
          <EmptyState
            title={search.status?.length === 1 && search.status[0] === 'pending_review' ? 'Nothing to review' : 'No rewards match'}
            description="Rewards appear here when a referred worker hits a program milestone. Programs set to manual review wait here for your approval."
            className="border-0 bg-transparent"
          />
        }
        bulkActions={(rows, clear) => {
          const pending = rows.filter((r) => r.status === 'pending_review')
          return (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline tabular">{selectedTotal(pending)} pending</span>
              <Button
                size="sm"
                disabled={!pending.length || decide.isPending}
                onClick={() => decide.mutate({ ids: pending.map((r) => r.id), decision: 'approve' }, { onSuccess: clear })}
              >
                <Check /> Approve{pending.length !== rows.length ? ` ${pending.length}` : ''}
              </Button>
              <Button size="sm" variant="outline" disabled={!pending.length} onClick={() => setVoiding({ ids: pending.map((r) => r.id), clear })}>
                <Ban /> Void
              </Button>
            </>
          )
        }}
      />
      <NoteDialog
        open={!!voiding}
        onOpenChange={(o) => !o && setVoiding(null)}
        title={voiding && voiding.ids.length > 1 ? `Void ${voiding.ids.length} rewards?` : 'Void this reward?'}
        description="Voided rewards never reach the worker's balance. The note is kept for your records."
        label="Reason"
        placeholder="e.g. Self-referral, duplicate account…"
        confirmLabel="Void"
        destructive
        pending={decide.isPending}
        onConfirm={(note) => voiding && decide.mutate({ ids: voiding.ids, decision: 'void', note })}
      />
    </>
  )
}
