import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Briefcase, Clock, Gift, Inbox, Plus, ShieldCheck, UserCheck, Users, Wallet } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { PageHeader } from '@/components/shared/page-header'
import { RelativeTime } from '@/components/shared/relative-time'
import { StatCard } from '@/components/shared/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    k.needsReview && { label: `${k.needsReview} submissions waiting for review`, to: '/admin/review', icon: Inbox },
    k.liveCheckDue && { label: `${k.liveCheckDue} live checks are due`, to: '/admin/review', search: { tab: 'live_check_due' }, icon: ShieldCheck },
    k.pendingApplicants && { label: `${k.pendingApplicants} new applicants`, to: '/admin/applicants', icon: UserCheck },
    k.unpaid && { label: `${formatMoney(k.unpaid)} approved but not yet paid`, to: '/admin/payouts', icon: Wallet },
    k.rewardsPendingReview && { label: `${k.rewardsPendingReview} referral rewards to verify`, to: '/admin/referrals', icon: Gift },
  ].filter(Boolean) as { label: string; to: string; search?: Record<string, string>; icon: typeof Inbox }[]

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good ${greeting()}, ${viewer.user.name.split(' ')[0] || 'there'}`}
        description="Here's what needs your attention across TinyGig today."
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
        <StatCard label="Needs review" value={formatNumber(k.needsReview)} icon={Inbox} tone={k.needsReview ? 'attention' : 'default'} to="/admin/review" hint={`${k.liveCheckDue} live checks due`} />
        <StatCard label="Pending applicants" value={formatNumber(k.pendingApplicants)} icon={UserCheck} tone={k.pendingApplicants ? 'attention' : 'default'} to="/admin/applicants" hint={`${formatNumber(k.approvedWorkers)} approved workers`} />
        <StatCard label="Unpaid balance" value={<Money paise={k.unpaid} />} icon={Wallet} to="/admin/payouts" hint={`${formatMoney(k.inPayout)} in open payouts`} />
        <StatCard label="Live gigs" value={formatNumber(k.liveGigs)} icon={Briefcase} to="/admin/gigs" hint={`${formatNumber(k.openSlots)} open slots`} />
        <StatCard label="Active workers (7d)" value={formatNumber(k.activeWorkers7d)} icon={Users} />
        <StatCard label="In progress" value={formatNumber(k.inProgress)} icon={Clock} hint={`${k.expiringSoon} due in the next 6h`} />
        <StatCard
          label="Approval rate (30d)"
          value={k.approvalRate30 == null ? '—' : `${Math.round(k.approvalRate30 * 100)}%`}
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard label="Paid (30d)" value={<Money paise={k.paid30} />} icon={Wallet} hint={`${formatMoney(k.paidAll)} all time`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>Last 30 days, by IST day</CardDescription>
          </CardHeader>
          <CardContent>
            <SubmissionsChart data={data.daily} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>Jump straight to the work</CardDescription>
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
              <EmptyState title="All clear" description="Nothing is waiting on you right now." className="border-0 py-6" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Payouts</CardTitle>
            <CardDescription>Paid per week, last 12 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            {data.weeklyPayouts.length ? (
              <PayoutsChart data={data.weeklyPayouts} />
            ) : (
              <EmptyState icon={Wallet} title="No payouts yet" description="Paid payouts will chart here." className="border-0" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Oldest in queue</CardTitle>
            <CardDescription>Review these first</CardDescription>
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
