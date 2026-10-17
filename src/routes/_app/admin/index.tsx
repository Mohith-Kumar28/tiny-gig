import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Briefcase, Gift, Inbox, Plus, ShieldCheck, UserCheck, Wallet } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { PageHeader } from '@/components/shared/page-header'
import { RelativeTime } from '@/components/shared/relative-time'
import { StatCard } from '@/components/shared/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PayoutsChart } from '@/features/analytics/components/payouts-chart'
import { SubmissionsChart } from '@/features/analytics/components/submissions-chart'
import { adminOverviewQuery } from '@/features/analytics/queries'
import { formatMoney, formatNumber } from '@/lib/format'

export const Route = createFileRoute('/_app/admin/')({
  head: () => ({ meta: [{ title: 'Overview · TinyGig Admin' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminOverviewQuery()),
  component: AdminOverview,
})

function AdminOverview() {
  const { viewer } = Route.useRouteContext()
  const { data } = useQuery(adminOverviewQuery())
  if (!data) return null
  const k = data.kpis
  const attention = [
    k.needsReview && { label: `${k.needsReview} to review`, to: '/admin/review', icon: Inbox },
    k.liveCheckDue && { label: `${k.liveCheckDue} live checks due`, to: '/admin/review', search: { tab: 'live_check_due' }, icon: ShieldCheck },
    k.pendingApplicants && { label: `${k.pendingApplicants} new applicants`, to: '/admin/applicants', icon: UserCheck },
    k.unpaid && { label: `${formatMoney(k.unpaid)} to pay`, to: '/admin/payouts', icon: Wallet },
    k.rewardsPendingReview && { label: `${k.rewardsPendingReview} referral rewards to check`, to: '/admin/referrals', icon: Gift },
  ].filter(Boolean) as { label: string; to: string; search?: Record<string, string>; icon: typeof Inbox }[]

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good ${greeting()}, ${viewer.user.name.split(' ')[0] || 'there'}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/review">
                <Inbox /> Start reviewing
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/gigs/new">
                <Plus /> New gig
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Needs review" value={formatNumber(k.needsReview + k.liveCheckDue)} icon={Inbox} tone={k.needsReview + k.liveCheckDue ? 'attention' : 'default'} to="/admin/review" />
        <StatCard label="New applicants" value={formatNumber(k.pendingApplicants)} icon={UserCheck} tone={k.pendingApplicants ? 'attention' : 'default'} to="/admin/applicants" />
        <StatCard label="To pay" value={<Money paise={k.unpaid} />} icon={Wallet} to="/admin/payouts" />
        <StatCard label="Live gigs" value={formatNumber(k.liveGigs)} icon={Briefcase} to="/admin/gigs" hint={`${formatNumber(k.openSlots)} open slots`} />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Submissions · 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <SubmissionsChart data={data.daily} />
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>To do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {attention.length ? (
              attention.map((a) => (
                <Link key={a.label} to={a.to} search={a.search} className="group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm hover:bg-accent/50">
                  <a.icon className="size-4 text-primary" />
                  <span className="flex-1">{a.label}</span>
                  <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                </Link>
              ))
            ) : (
              <EmptyState title="All clear" className="border-0 py-6" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Paid per week</CardTitle>
          </CardHeader>
          <CardContent>
            {data.weeklyPayouts.length ? (
              <PayoutsChart data={data.weeklyPayouts} />
            ) : (
              <EmptyState icon={Wallet} title="No payouts yet" className="border-0" />
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Oldest in queue</CardTitle>
          </CardHeader>
          <CardContent>
            {data.oldestPending.length ? (
              <ul className="divide-y">
                {data.oldestPending.map((s) => (
                  <li key={s.id}>
                    <Link to="/admin/review" search={{ selected: s.id }} className="flex items-center gap-3 py-2.5 text-sm hover:text-primary">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{s.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.worker}</p>
                      </div>
                      <RelativeTime date={s.submittedAt} className="text-xs text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Queue is empty.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function greeting() {
  const h = Number(new Date().toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }))
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}
