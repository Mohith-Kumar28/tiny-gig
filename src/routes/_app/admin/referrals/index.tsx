import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangle, BadgeCheck, CircleDollarSign, Clock, Percent, Settings2, UserPlus, Users, Wallet } from 'lucide-react'
import { z } from 'zod'
import { useTableSearch } from '@/components/data-table/use-table-search'
import { Money } from '@/components/shared/money'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReferralLeaderboard } from '@/features/referrals/components/referral-leaderboard'
import { ReferralsTable } from '@/features/referrals/components/referrals-table'
import { RewardsTable } from '@/features/referrals/components/rewards-table'
import { referralStatsQuery, referralsQuery, rewardsQuery } from '@/features/referrals/queries'
import {
  type ReferralsSearch,
  type RewardsSearch,
  referralsSearchSchema,
  rewardsSearchSchema,
} from '@/features/referrals/server/referrals'
import { formatNumber } from '@/lib/format'

const TABS = ['rewards', 'referrals', 'leaderboard'] as const
type Tab = (typeof TABS)[number]

const searchSchema = rewardsSearchSchema.extend({
  tab: z.enum(TABS).optional().catch(undefined),
  flagged: referralsSearchSchema.shape.flagged,
  stage: referralsSearchSchema.shape.stage,
})
type Search = z.infer<typeof searchSchema>

// The rewards and referrals tables share one URL; these pick each table's slice
// so the loader and the component build identical query keys.
function rewardsArgs(s: Search): RewardsSearch {
  return {
    q: s.q,
    sort: s.sort,
    page: s.page,
    perPage: s.perPage,
    status: s.status ?? ['pending_review'],
    role: s.role,
    programId: s.programId,
  }
}
function referralsArgs(s: Search): ReferralsSearch {
  return { q: s.q, sort: s.sort, page: s.page, perPage: s.perPage, flagged: s.flagged, stage: s.stage }
}

export const Route = createFileRoute('/_app/admin/referrals/')({
  head: () => ({ meta: [{ title: 'Referrals · TinyGig Admin' }] }),
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const qc = context.queryClient
    const tab = deps.tab ?? 'rewards'
    await Promise.all([
      qc.ensureQueryData(referralStatsQuery()),
      tab === 'rewards' ? qc.ensureQueryData(rewardsQuery(rewardsArgs(deps))) : null,
      tab === 'referrals' ? qc.ensureQueryData(referralsQuery(referralsArgs(deps))) : null,
    ])
  },
  component: ReferralsPage,
})

function ReferralsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useTableSearch(navigate as never)
  const { data: stats } = useQuery(referralStatsQuery())
  const tab: Tab = search.tab ?? 'rewards'

  // Switching tabs drops the other table's filters, since q/sort/page are shared keys.
  const setTab = (t: string) => navigate({ search: t === 'rewards' ? {} : { tab: t as Tab }, replace: true })
  const resetTab = () => navigate({ search: tab === 'rewards' ? {} : { tab }, replace: true })

  const conversion = stats?.total ? Math.round((stats.active / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referrals"
        description="Track who brings in new workers, review the rewards your programs create, and catch self-referrals before they're paid."
        actions={
          <Button asChild>
            <Link to="/admin/referrals/programs">
              <Settings2 /> Programs
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total referrals" icon={UserPlus} value={formatNumber(stats?.total ?? 0)} />
        <StatCard label="Approved" icon={BadgeCheck} value={formatNumber(stats?.approved ?? 0)} hint="Referred workers approved" />
        <StatCard label="Active" icon={Users} tone="success" value={formatNumber(stats?.active ?? 0)} hint="Finished their first gig" />
        <StatCard label="Conversion" icon={Percent} value={`${conversion}%`} hint="Referred → first gig done" />
        <StatCard label="Rewards owed" icon={Wallet} value={<Money paise={stats?.owed ?? 0} className="font-semibold" />} hint="Approved + awaiting review" />
        <StatCard label="Rewards paid" icon={CircleDollarSign} value={<Money paise={stats?.paid ?? 0} className="font-semibold" />} />
        <StatCard
          label="Pending review"
          icon={Clock}
          tone={stats?.pendingReview ? 'attention' : 'default'}
          value={formatNumber(stats?.pendingReview ?? 0)}
          to="/admin/referrals"
          search={{}}
        />
        <StatCard
          label="Flagged referrals"
          icon={AlertTriangle}
          tone={stats?.flagged ? 'attention' : 'default'}
          value={formatNumber(stats?.flagged ?? 0)}
          hint="Shared phone, UPI or Reddit"
          to="/admin/referrals"
          search={{ tab: 'referrals', flagged: true }}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rewards">
            Rewards queue
            {stats?.pendingReview ? (
              <Badge variant="secondary" className="ml-1 h-4.5 min-w-4.5 px-1 tabular">
                {stats.pendingReview}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>
        <TabsContent value="rewards" className="mt-2">
          <RewardsTable
            search={rewardsArgs(search)}
            onSearchChange={onSearchChange}
            hasActiveFilters={Boolean(search.status || search.role || search.programId || search.q)}
            onReset={resetTab}
          />
        </TabsContent>
        <TabsContent value="referrals" className="mt-2">
          <ReferralsTable
            search={referralsArgs(search)}
            onSearchChange={onSearchChange}
            hasActiveFilters={Boolean(search.stage || search.flagged != null || search.q)}
            onReset={resetTab}
          />
        </TabsContent>
        <TabsContent value="leaderboard" className="mt-2">
          <ReferralLeaderboard leaders={stats?.leaders ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
