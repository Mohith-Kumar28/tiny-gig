import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight, BadgeCheck, ChevronRight, ClipboardCheck, Hand, Hourglass, Search, Send, Wallet } from 'lucide-react'
import { Money } from '@/components/shared/money'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { PlatformIcon } from '@/components/shared/platform-icon'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TaskWhen } from '@/features/submissions/components/worker-task-row'
import { formatMoney, pluralize } from '@/lib/format'
import type { getMyEarnings } from '@/features/payouts/server/payouts'
import type { getWorkerOverview } from '../server/analytics'
import { EarningsChart } from './earnings-chart'

type Overview = Awaited<ReturnType<typeof getWorkerOverview>>
type Earnings = Awaited<ReturnType<typeof getMyEarnings>>

const STEPS = [
  { icon: Search, title: 'Find a gig', body: 'Browse open gigs and pick one you qualify for.' },
  { icon: Hand, title: 'Raise your hand', body: 'Tap “I’m interested”. We pick one account per slot.' },
  { icon: Send, title: 'Do it & submit', body: 'Post as briefed, then paste the link to your post.' },
  { icon: Wallet, title: 'Get paid', body: 'After approval, money goes to your UPI.' },
]

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function WorkerOverview({ overview, earnings }: { overview: Overview; earnings: Earnings | undefined }) {
  const firstName = overview.name.split(' ')[0] ?? overview.name
  const changes = overview.active.filter((a) => a.status === 'changes_requested')
  const isNew = overview.totalTasks === 0
  const weekTotal = overview.weekly.reduce((s, w) => s + w.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.65rem]" suppressHydrationWarning>
            {greeting()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {overview.active.length
              ? `You have ${pluralize(overview.active.length, 'task')} on the go.`
              : 'Ready for your next gig?'}
          </p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link to="/w/gigs">
            <Search /> {overview.openGigs ? `Browse ${pluralize(overview.openGigs, 'open gig')}` : 'Browse gigs'}
          </Link>
        </Button>
      </div>

      {changes.length ? (
        <Link
          to={changes.length === 1 ? '/w/work/$submissionId' : '/w/work'}
          params={changes.length === 1 ? { submissionId: changes[0]!.id } : undefined}
          className="flex items-center gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4 transition-colors hover:bg-warning/15"
        >
          <AlertTriangle className="size-5 shrink-0 text-warning-foreground dark:text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Action needed: {changes.length === 1 ? '1 task needs changes' : `${changes.length} tasks need changes`}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {changes.length === 1 ? changes[0]!.title : 'Fix and resubmit before the deadline to get paid.'}
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}

      {isNew ? (
        <section className="rounded-xl border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Welcome to TinyGig! Here's how you earn</h2>
          <p className="mt-1 text-sm text-muted-foreground">It takes 4 simple steps. Most gigs take 10–20 minutes.</p>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 sm:flex-col">
                <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <s.icon className="size-5" />
                  <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                </span>
                <div>
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Button asChild className="mt-6 w-full sm:w-auto">
            <Link to="/w/gigs">
              Find your first gig <ArrowRight />
            </Link>
          </Button>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Unpaid balance"
          value={earnings ? <Money paise={earnings.unpaid} /> : <Skeleton className="h-8 w-20" />}
          hint="Paid in the next payout"
          icon={Wallet}
          tone={earnings?.unpaid ? 'attention' : 'default'}
          to="/w/payments"
        />
        <StatCard
          label="In payout"
          value={earnings ? <Money paise={earnings.processing} /> : <Skeleton className="h-8 w-20" />}
          hint="Being sent to your UPI"
          icon={Hourglass}
          to="/w/payments"
        />
        <StatCard
          label="Paid so far"
          value={earnings ? <Money paise={earnings.paid} /> : <Skeleton className="h-8 w-20" />}
          hint={earnings ? `${formatMoney(earnings.lifetime)} earned in total` : undefined}
          icon={BadgeCheck}
          tone="success"
          to="/w/payments"
        />
        <StatCard
          label="Approval rate"
          value={overview.approvalRate == null ? '—' : `${Math.round(overview.approvalRate * 100)}%`}
          hint={`${overview.approved} approved · ${overview.rejected} not approved`}
          icon={ClipboardCheck}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="font-display text-base font-semibold">Active tasks</h2>
            <Button asChild variant="ghost" size="sm" className="-mr-2">
              <Link to="/w/work">
                View all <ChevronRight />
              </Link>
            </Button>
          </div>
          {overview.active.length ? (
            <ul className="divide-y">
              {overview.active.map((t) => (
                <li key={t.id}>
                  <Link
                    to="/w/work/$submissionId"
                    params={{ submissionId: t.id }}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
                  >
                    <PlatformIcon platform={t.platform} className="size-4.5" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={t.status} />
                        <TaskWhen task={t} />
                      </div>
                    </div>
                    <Money paise={t.payoutAmount} className="shrink-0 text-sm" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">No active tasks. Raise your hand on a gig to get started.</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/w/gigs">Find gigs</Link>
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="font-display text-base font-semibold">Weekly earnings</h2>
            <span className="text-xs text-muted-foreground">
              Last 8 weeks · <Money paise={weekTotal} />
            </span>
          </div>
          {weekTotal ? (
            <EarningsChart rows={overview.weekly} />
          ) : (
            <div className="flex h-44 items-center justify-center rounded-lg bg-muted/40 px-6 text-center text-sm text-muted-foreground">
              Your approved earnings will show up here week by week.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
