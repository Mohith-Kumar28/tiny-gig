import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Settings2 } from 'lucide-react'
import { z } from 'zod'
import { useTableSearch } from '@/components/data-table/use-table-search'
import { Money } from '@/components/shared/money'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard, StatGrid } from '@/components/shared/stat-card'
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
        description="Workers bring in workers. Check rewards before they reach a balance, and watch for flagged sign-ups."
        actions={
          <Button asChild variant="outline">
            <Link to="/admin/referrals/programs">
              <Settings2 /> Programs
            </Link>
          </Button>
        }
      />

      <StatGrid className="grid-cols-2 md:grid-cols-4">
        <StatCard label="Referrals" value={formatNumber(stats?.total ?? 0)} hint={`${conversion}% did a gig`} />
        <StatCard
          label="Rewards to check"
          tone={stats?.pendingReview ? 'attention' : 'default'}
          value={formatNumber(stats?.pendingReview ?? 0)}
        />
        <StatCard label="Rewards owed" value={<Money paise={stats?.owed ?? 0} className="font-bold" />} />
        <StatCard
          label="Flagged"
          tone={stats?.flagged ? 'attention' : 'default'}
          value={formatNumber(stats?.flagged ?? 0)}
          to="/admin/referrals"
          search={{ tab: 'referrals', flagged: true }}
        />
      </StatGrid>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rewards">
            Rewards queue
            {stats?.pendingReview ? (
              <span className="ml-1 rounded-[3px] bg-primary/10 px-1 text-xs font-medium text-primary tabular">{stats.pendingReview}</span>
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
