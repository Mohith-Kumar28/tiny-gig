import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import type { OnSearchChange } from '@/components/data-table/types'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { useAction } from '@/hooks/use-action'
import { referralsQuery } from '../queries'
import { type ReferralsSearch, setReferralFlag } from '../server/referrals'
import { NoteDialog } from './note-dialog'
import { type ReferralRow, referralColumns } from './referral-columns'

const STAGE_OPTIONS = [
  { label: 'Signed up', value: 'signed_up' },
  { label: 'Approved', value: 'approved' },
  { label: 'First gig done', value: 'first_gig' },
]

/** Every referral (referrer → referee) with funnel progress and fraud flags. */
export function ReferralsTable({
  search,
  onSearchChange,
  hasActiveFilters,
  onReset,
}: {
  search: ReferralsSearch
  onSearchChange: OnSearchChange
  hasActiveFilters: boolean
  onReset: () => void
}) {
  const { data, isFetching } = useQuery({ ...referralsQuery(search), placeholderData: keepPreviousData })
  const [flagging, setFlagging] = useState<ReferralRow | null>(null)

  const setFlag = useAction((v: { id: string; flagged: boolean; reason?: string }) => setReferralFlag({ data: v }), {
    success: (_, v) => (v.flagged ? 'Referral flagged. It no longer counts toward rewards.' : 'Referral unflagged and re-evaluated'),
    invalidate: [['admin']],
    onSuccess: () => setFlagging(null),
  })

  const columns = useMemo(
    () =>
      referralColumns({
        onFlag: (r) => setFlagging(r),
        onUnflag: (r) => setFlag.mutate({ id: r.id, flagged: false }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <>
      <DataTable<ReferralRow>
        columns={columns}
        data={data}
        search={search}
        onSearchChange={onSearchChange}
        getRowId={(r) => r.id}
        isFetching={isFetching}
        searchPlaceholder="Search referee, referrer or code…"
        hasActiveFilters={hasActiveFilters}
        onResetFilters={onReset}
        filters={
          <>
            <DataTableFacetedFilter title="Stage" options={STAGE_OPTIONS} value={search.stage} onChange={(v) => onSearchChange({ stage: v })} />
            <Button
              variant={search.flagged ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 border-dashed"
              onClick={() => onSearchChange({ flagged: search.flagged ? undefined : true })}
            >
              Flagged only
            </Button>
          </>
        }
        empty={
          <EmptyState
            icon={Users}
            title="No referrals yet"
            description="When someone applies through a worker's /r/ link, the referral shows up here."
            className="border-0 bg-transparent"
          />
        }
      />
      <NoteDialog
        open={!!flagging}
        onOpenChange={(o) => !o && setFlagging(null)}
        title={`Flag ${flagging?.refereeName ?? 'referral'}?`}
        description={`Flagged referrals stop counting toward ${flagging?.referrerName ?? 'the referrer'}'s rewards until you unflag them. Rewards already created are not voided automatically.`}
        label="Reason"
        placeholder="e.g. Same UPI as the referrer"
        confirmLabel="Flag referral"
        destructive
        pending={setFlag.isPending}
        onConfirm={(reason) => flagging && setFlag.mutate({ id: flagging.id, flagged: true, reason })}
      />
    </>
  )
}
