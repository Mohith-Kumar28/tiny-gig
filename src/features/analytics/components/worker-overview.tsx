import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight, ChevronRight, Search } from 'lucide-react'
import { Money } from '@/components/shared/money'
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
  { title: 'Raise your hand', body: 'Open Gigs and tap “I’m interested” on one you qualify for.' },
  { title: 'Get picked', body: 'We pick one account per slot and tell you if it’s yours.' },
  { title: 'Post and send the link', body: 'Write it yourself, as briefed, then paste the link.' },
  { title: 'Get paid on Monday', body: 'Approved work goes out with the weekly UPI payout.' },
]

function greeting() {
  const h = Number(new Date().toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }))
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/** The next weekly payout run: Monday, India time. */
function nextPayoutDay() {
  const ist = new Date(Date.now() + 5.5 * 3_600_000)
  const add = ((8 - ist.getUTCDay()) % 7) || 7
  const d = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + add))
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function WorkerOverview({ overview, earnings }: { overview: Overview; earnings: Earnings | undefined }) {
  const firstName = overview.name.split(' ')[0] ?? overview.name
  const changes = overview.active.filter((a) => a.status === 'changes_requested')
  const isNew = overview.totalTasks === 0
  const weekTotal = overview.weekly.reduce((s, w) => s + w.amount, 0)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-[1.6rem] leading-tight font-bold sm:text-[1.85rem]" suppressHydrationWarning>
          {greeting()}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {overview.active.length ? `You have ${pluralize(overview.active.length, 'task')} on the go.` : 'Ready for your next gig?'}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        {/* The balance plate: a full field of khata red, the one place the worker app commits to it. */}
        <section aria-labelledby="balance-title" className="overflow-hidden rounded-lg bg-cloth text-cloth-foreground">
          <Link to="/w/payments" className="block px-5 pt-4 pb-5 transition-colors hover:bg-white/[0.04]">
            <h2 id="balance-title" className="ledger-label text-cloth-foreground/70">
              Your balance
            </h2>
            <p className="mt-2 font-display text-[2.6rem] leading-none font-extrabold">
              {earnings ? <span className="ledger-total">{formatMoney(earnings.unpaid)}</span> : <Skeleton className="h-10 w-28 bg-white/15" />}
            </p>
            <p className="mt-3 text-sm text-cloth-foreground/80" suppressHydrationWarning>
              {earnings?.unpaid ? `Goes out with the payout on ${nextPayoutDay()}.` : 'Approved work lands here, then goes out every Monday.'}
            </p>
          </Link>
          <dl className="grid grid-cols-3 border-t border-white/15 text-sm">
            {[
              ['In payout', earnings ? formatMoney(earnings.processing) : null],
              ['Paid so far', earnings ? formatMoney(earnings.paid) : null],
              ['Approved', overview.approvalRate == null ? '—' : `${Math.round(overview.approvalRate * 100)}%`],
            ].map(([k, v], i) => (
              <div key={k} className={i ? 'border-l border-white/15 px-4 py-3' : 'px-5 py-3'}>
                <dt className="ledger-label text-[0.64rem] text-cloth-foreground/65">{k}</dt>
                <dd className="mt-0.5 font-display text-base font-bold tabular">{v ?? '…'}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="space-y-3">
          <Button asChild size="lg" className="h-12 w-full text-base">
            <Link to="/w/gigs">
              <Search /> {overview.openGigs ? `Browse ${pluralize(overview.openGigs, 'open gig')}` : 'Browse gigs'}
            </Link>
          </Button>
          {changes.length ? (
            <Link
              to={changes.length === 1 ? '/w/work/$submissionId' : '/w/work'}
              params={changes.length === 1 ? { submissionId: changes[0]!.id } : undefined}
              className="flex items-center gap-3 rounded-lg border border-warning/60 bg-warning/12 p-4 transition-colors hover:bg-warning/18"
            >
              <AlertTriangle className="size-5 shrink-0 text-warning-foreground dark:text-warning" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {changes.length === 1 ? '1 task needs changes' : `${changes.length} tasks need changes`}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {changes.length === 1 ? changes[0]!.title : 'Fix and send them again before the deadline to get paid.'}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ) : null}
        </div>
      </div>

      {isNew ? (
        <section className="rounded-lg border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">How you earn on TinyGig</h2>
          <ol className="mt-4 border-t">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-x-2 border-b py-3">
                <span className="font-display text-lg leading-6 font-extrabold text-primary tabular">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Button asChild className="mt-5 w-full sm:w-auto">
            <Link to="/w/gigs">
              Find your first gig <ArrowRight />
            </Link>
          </Button>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
            <h2 className="font-display text-base font-bold">Active tasks</h2>
            <Button asChild variant="ghost" size="sm" className="-mr-2">
              <Link to="/w/work">
                All work <ChevronRight />
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
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                  >
                    <PlatformIcon platform={t.platform} className="size-4.5" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="truncate text-sm font-semibold">{t.title}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={t.status} />
                        <TaskWhen task={t} />
                      </div>
                    </div>
                    <Money paise={t.payoutAmount} className="shrink-0 font-display text-base font-bold" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">Nothing on the go. Raise your hand on a gig to get started.</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/w/gigs">Find gigs</Link>
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="font-display text-base font-bold">Weekly earnings</h2>
            <span className="text-xs text-muted-foreground">
              Last 8 weeks: <Money paise={weekTotal} />
            </span>
          </div>
          {weekTotal ? (
            <EarningsChart rows={overview.weekly} />
          ) : (
            <div className="flex h-44 items-center justify-center rounded-md bg-muted/50 px-6 text-center text-sm text-muted-foreground">
              Approved earnings show up here, week by week.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
