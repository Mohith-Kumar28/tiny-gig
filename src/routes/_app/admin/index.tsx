import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight, Inbox, Plus, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { PageHeader } from '@/components/shared/page-header'
import { RelativeTime } from '@/components/shared/relative-time'
import { StatCard, StatGrid } from '@/components/shared/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PayoutsChart } from '@/features/analytics/components/payouts-chart'
import { SubmissionsChart } from '@/features/analytics/components/submissions-chart'
import { adminOverviewQuery } from '@/features/analytics/queries'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/admin/')({
  head: () => ({ meta: [{ title: 'Overview · TinyGig Admin' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminOverviewQuery()),
  component: AdminOverview,
})

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

type Due = {
  key: string
  label: string
  note?: ReactNode
  figure: ReactNode
  live: boolean
  to: '/admin/review' | '/admin/applicants' | '/admin/referrals' | '/admin/payouts'
  search?: { tab: 'live_check_due' }
}

function AdminOverview() {
  const { viewer } = Route.useRouteContext()
  const { data } = useQuery(adminOverviewQuery())
  if (!data) return null
  const k = data.kpis
  const oldest = data.oldestPending[0]

  // One ledger of everything waiting on staff. The two review rows add up to the inbox badge.
  const due: Due[] = [
    {
      key: 'review',
      label: plural(k.needsReview, 'Submission to review', 'Submissions to review'),
      note: oldest ? (
        <>
          Oldest sent <RelativeTime date={oldest.submittedAt} />
        </>
      ) : (
        'Inbox is clear'
      ),
      figure: formatNumber(k.needsReview),
      live: k.needsReview > 0,
      to: '/admin/review',
    },
    ...(k.liveCheckDue
      ? [
          {
            key: 'live',
            label: plural(k.liveCheckDue, 'Live check due', 'Live checks due'),
            note: 'Open the post and confirm it is still up',
            figure: formatNumber(k.liveCheckDue),
            live: true,
            to: '/admin/review' as const,
            search: { tab: 'live_check_due' as const },
          },
        ]
      : []),
    {
      key: 'applicants',
      label: plural(k.pendingApplicants, 'Applicant to approve', 'Applicants to approve'),
      note: k.pendingApplicants ? 'Check their accounts, then approve or decline' : 'No one waiting',
      figure: formatNumber(k.pendingApplicants),
      live: k.pendingApplicants > 0,
      to: '/admin/applicants',
    },
    ...(k.rewardsPendingReview
      ? [
          {
            key: 'rewards',
            label: plural(k.rewardsPendingReview, 'Referral reward to check', 'Referral rewards to check'),
            figure: formatNumber(k.rewardsPendingReview),
            live: true,
            to: '/admin/referrals' as const,
          },
        ]
      : []),
    {
      key: 'pay',
      label: 'Owed to workers',
      note: k.unpaid ? 'Approved work not yet in a payout' : 'Everyone is paid up',
      figure: <Money paise={k.unpaid} className="font-bold" />,
      live: k.unpaid > 0,
      to: '/admin/payouts',
    },
  ]
  const waitingCount = k.needsReview + k.liveCheckDue + k.pendingApplicants + k.rewardsPendingReview

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good ${greeting()}, ${viewer.user.name.split(' ')[0] || 'there'}`}
        description={
          waitingCount
            ? `${formatNumber(waitingCount)} ${plural(waitingCount, 'thing is', 'things are')} waiting on you.`
            : 'Nothing is waiting on you right now.'
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/gigs/new">
                <Plus /> New gig
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/review">
                <Inbox /> Start reviewing
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="due-title" className="min-w-0 overflow-hidden rounded-lg border bg-card">
          <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
            <h2 id="due-title" className="font-display text-[1.02rem] font-bold">
              Waiting on you
            </h2>
            <span className="ledger-label">Count</span>
          </div>
          <ul className="divide-y">
            {due.map((d) => (
              <li key={d.key}>
                <Link
                  to={d.to}
                  search={d.search}
                  className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-sm font-medium', !d.live && 'text-muted-foreground')}>{d.label}</span>
                    {d.note ? <span className="block truncate text-xs text-muted-foreground">{d.note}</span> : null}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-right font-display text-xl font-bold tabular',
                      !d.live && 'text-muted-foreground/70',
                    )}
                  >
                    {d.figure}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="oldest-title" className="flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card">
          <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
            <h2 id="oldest-title" className="font-display text-[1.02rem] font-bold">
              Oldest in queue
            </h2>
            <span className="ledger-label">Waiting</span>
          </div>
          {data.oldestPending.length ? (
            <ol className="divide-y">
              {data.oldestPending.map((s) => (
                <li key={s.id}>
                  <Link
                    to="/admin/review"
                    search={{ selected: s.id }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{s.worker}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.title}</p>
                    </div>
                    <RelativeTime date={s.submittedAt} className="shrink-0 text-xs text-muted-foreground tabular" />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Queue is empty. New submissions land here first.
            </p>
          )}
          <Link
            to="/admin/review"
            className="mt-auto flex items-center justify-between gap-2 border-t px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            Open the review inbox
            <ChevronRight className="size-4" />
          </Link>
        </section>
      </div>

      <StatGrid className="grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Live gigs"
          value={formatNumber(k.liveGigs)}
          to="/admin/gigs"
          hint={`${formatNumber(k.openSlots)} open ${plural(k.openSlots, 'slot', 'slots')}`}
        />
        <StatCard
          label="Tasks in progress"
          value={formatNumber(k.inProgress)}
          hint={k.expiringSoon ? `${formatNumber(k.expiringSoon)} due within 6 hours` : 'None due within 6 hours'}
        />
        <StatCard
          label="Approval rate · 30 days"
          value={k.approvalRate30 == null ? '—' : `${Math.round(k.approvalRate30 * 100)}%`}
          hint={k.approvalRate30 == null ? 'No decisions yet' : 'Approved out of decided'}
        />
        <StatCard
          label="Paid · 30 days"
          value={<Money paise={k.paid30} className="ledger-total font-bold" />}
          hint={
            k.inPayout ? (
              <>
                <Money paise={k.inPayout} /> in payouts not yet marked paid
              </>
            ) : (
              'No payouts in progress'
            )
          }
          tone={k.paid30 ? 'success' : 'default'}
          to="/admin/payouts"
        />
      </StatGrid>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="min-w-0 gap-3">
          <CardHeader>
            <CardTitle>Submissions · 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <SubmissionsChart data={data.daily} />
          </CardContent>
        </Card>
        <Card className="min-w-0 gap-3">
          <CardHeader>
            <CardTitle>Paid per week</CardTitle>
          </CardHeader>
          <CardContent>
            {data.weeklyPayouts.length ? (
              <PayoutsChart data={data.weeklyPayouts} />
            ) : (
              <EmptyState
                icon={Wallet}
                title="No payouts yet"
                description="Weekly UPI payouts show up here once you mark a batch paid."
                className="h-60 border-0 bg-transparent py-6"
              />
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
