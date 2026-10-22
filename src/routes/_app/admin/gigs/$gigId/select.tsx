import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Ban, Hand, UserPlus } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Countdown } from '@/components/shared/countdown'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { PLATFORM_LABELS, PlatformIcon } from '@/components/shared/platform-icon'
import { formatDate, RelativeTime } from '@/components/shared/relative-time'
import { StatCard, StatGrid } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { WhatsAppIcon, whatsappLink } from '@/components/shared/whatsapp-icon'
import { Button } from '@/components/ui/button'
import { LevelBadge } from '@/features/accounts/components/account-columns'
import { accountLabel, isKarmaStale } from '@/features/accounts/rules'
import { type AssignTarget, AssignDialog } from '@/features/opportunities/components/assign-dialog'
import { DirectAssignDialog } from '@/features/opportunities/components/direct-assign'
import { selectionQuery } from '@/features/opportunities/queries'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/admin/gigs/$gigId/select')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(selectionQuery(params.gigId)),
  head: ({ loaderData }) => ({ meta: [{ title: `Pick accounts · ${loaderData?.gig.title ?? 'Gig'} · TinyGig Admin` }] }),
  component: SelectPage,
})

/** Assignments that no longer hold a slot or money. */
const RELEASED = new Set(['rejected', 'expired', 'withdrawn'])

function Fact({ label, children, title }: { label: string; children: ReactNode; title?: string }) {
  return (
    <div className="min-w-0" title={title}>
      <dt className="ledger-label">{label}</dt>
      <dd className="truncate text-sm font-medium tabular">{children}</dd>
    </div>
  )
}

/** §4.2: the screen that decides adoption. Facts side by side, best fit first, the reason in words. */
function SelectPage() {
  const { gigId } = Route.useParams()
  const { data } = useSuspenseQuery(selectionQuery(gigId))
  const [target, setTarget] = useState<AssignTarget | null>(null)
  const [direct, setDirect] = useState(false)
  const [directOpen, setDirectOpen] = useState(false)
  const g = data.gig
  const full = g.slotsLeft === 0
  const active = data.assigned.filter((a) => !RELEASED.has(a.status))
  const committed = active.reduce((sum, a) => sum + a.payoutAmount, 0)
  const openDirect = () => {
    setDirect(true)
    setDirectOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 max-w-full text-muted-foreground">
          <Link to="/admin/gigs/$gigId" params={{ gigId }}>
            <ArrowLeft /> <span className="truncate">{g.title}</span>
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="font-display text-[1.6rem] leading-tight font-bold sm:text-[1.85rem]">Pick accounts</h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <PlatformIcon platform={g.platform} /> {PLATFORM_LABELS[g.platform]}
                {g.community ? ` · ${g.community}` : ''}
              </span>
              {data.windowOpen && g.interestClosesAt ? (
                <Countdown to={g.interestClosesAt} prefix="Interest window closes" />
              ) : g.interestClosesAt ? (
                <span>Interest window closed {formatDate(g.interestClosesAt)}</span>
              ) : null}
            </p>
          </div>
          <Button variant="outline" disabled={full} onClick={openDirect}>
            <UserPlus /> Assign directly
          </Button>
        </div>
      </div>

      <StatGrid className="grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Slots open"
          value={
            <>
              {formatNumber(g.slotsLeft)}
              <span className="text-base font-semibold text-muted-foreground"> / {formatNumber(g.totalSlots)}</span>
            </>
          }
          tone={full ? 'success' : 'default'}
          hint={full ? 'All slots are filled' : `${formatNumber(g.totalSlots - g.slotsLeft)} taken`}
        />
        <StatCard
          label="Raised a hand"
          value={formatNumber(data.counts.interested)}
          hint={`${formatNumber(data.candidates.length)} ${data.candidates.length === 1 ? 'account' : 'accounts'} offered`}
        />
        <StatCard
          label="Committed"
          value={<Money paise={committed} className="font-bold" />}
          hint={`Rates locked on ${formatNumber(active.length)} ${active.length === 1 ? 'assignment' : 'assignments'}`}
        />
        <StatCard
          label="Still open, at most"
          value={<Money paise={g.slotsLeft * g.payoutAmount} className="font-bold" />}
          hint={
            <>
              {formatNumber(g.slotsLeft)} × up to <Money paise={g.payoutAmount} />
            </>
          }
        />
      </StatGrid>

      {data.candidates.length ? (
        <section aria-labelledby="candidates-title" className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="candidates-title" className="font-display text-lg font-bold">
              Candidates, best fit first
            </h2>
            <p className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-3 w-0.5 bg-warning" /> Breaks a cooldown: needs a reason
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Ban className="size-3.5 text-destructive" /> Blocked: can’t be picked
              </span>
            </p>
          </div>
          <ol className="divide-y overflow-hidden rounded-lg border bg-card">
            {data.candidates.map((c, i) => {
              const stale = isKarmaStale(c.karmaUpdatedAt, 30)
              const blocked = c.hard.length > 0
              const risky = !blocked && c.soft.length > 0
              const pick = () => {
                setDirect(false)
                setTarget({ accountId: c.accountId, label: c.label, workerName: c.workerName, hard: c.hard, soft: c.soft })
              }
              return (
                <li
                  key={c.accountId}
                  className={cn(
                    'relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 px-4 py-3.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]',
                    blocked && 'bg-muted/40',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-y-0 left-0 w-[3px]',
                      blocked ? 'bg-destructive/50' : risky ? 'bg-warning' : i === 0 ? 'bg-success' : 'bg-transparent',
                    )}
                  />
                  <span
                    className={cn(
                      'pt-0.5 text-right font-display text-xl leading-none font-bold tabular',
                      blocked ? 'text-muted-foreground/60' : 'text-foreground',
                    )}
                  >
                    <span className="sr-only">Rank </span>
                    {i + 1}
                  </span>

                  <div className="min-w-0 space-y-2">
                    <div className="space-y-0.5">
                      <p className={cn('text-sm font-semibold', blocked && 'text-muted-foreground')}>
                        {c.label} <span className="font-normal text-muted-foreground">· {c.workerName}</span>
                        {i === 0 && !blocked && !risky ? (
                          <span className="ml-2 align-middle text-xs font-medium text-success">Best fit</span>
                        ) : null}
                      </p>
                      <p className={cn('text-sm', blocked ? 'text-muted-foreground' : 'text-foreground/85')}>{c.reason}</p>
                    </div>

                    <dl className={cn('grid grid-cols-2 gap-x-5 gap-y-1.5 sm:grid-cols-3 xl:grid-cols-6', blocked && 'opacity-70')}>
                      <Fact label="Level">
                        <LevelBadge level={c.facts.level} />
                      </Fact>
                      <Fact
                        label="Karma"
                        title={c.karmaUpdatedAt ? `Checked ${formatDate(c.karmaUpdatedAt)}${stale ? ', over 30 days ago' : ''}` : 'Never checked'}
                      >
                        <span className={cn(stale && 'text-muted-foreground')}>
                          {c.facts.karma == null ? '—' : formatNumber(c.facts.karma)}
                        </span>
                        {stale ? <span className="ml-1 text-xs font-normal text-muted-foreground">(old)</span> : null}
                      </Fact>
                      <Fact label="Last client post">{c.facts.daysSinceClientWork == null ? 'Never' : `${c.facts.daysSinceClientWork}d ago`}</Fact>
                      <Fact label="Last client">{c.lastClient ?? '—'}</Fact>
                      <Fact label="In this community">{c.facts.lastInCommunityAt ? formatDate(c.facts.lastInCommunityAt) : 'Never'}</Fact>
                      <Fact label="Approved / rejected">
                        {c.facts.approved} / {c.facts.rejected}
                      </Fact>
                    </dl>

                    {c.hard.length || c.soft.length ? (
                      <ul className="space-y-1 text-xs">
                        {c.hard.map((b) => (
                          <li key={b.rule} className="flex gap-1.5 font-medium text-destructive">
                            <Ban className="mt-px size-3.5 shrink-0" /> {b.message}
                          </li>
                        ))}
                        {c.soft.map((b) => (
                          <li key={b.rule} className="flex gap-1.5 font-medium text-warning-foreground dark:text-warning">
                            <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning" /> {b.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <p className="text-[11px] text-muted-foreground">
                      Raised a hand <RelativeTime date={c.interestedAt} />
                    </p>
                  </div>

                  <div className="col-start-2 mt-3 flex items-center gap-1.5 sm:col-start-3 sm:mt-0 sm:items-start">
                    {c.phone ? (
                      <Button asChild variant="ghost" size="icon" className="size-8" aria-label={`WhatsApp ${c.workerName}`}>
                        <a
                          href={whatsappLink(c.phone, `Hi ${c.workerName.split(' ')[0]}, about “${g.title}” on ${c.label}: `)}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          <WhatsAppIcon />
                        </a>
                      </Button>
                    ) : null}
                    {blocked ? (
                      <Button size="sm" variant="outline" disabled className="min-w-24">
                        <Ban /> Blocked
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant={risky ? 'outline' : 'default'}
                        disabled={full}
                        onClick={pick}
                        className={cn('min-w-24', risky && 'border-warning/70 hover:bg-warning/10')}
                      >
                        {risky ? <AlertTriangle className="text-warning" /> : null}
                        {risky ? 'Select…' : 'Select'}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ) : full ? null : (
        <EmptyState
          icon={Hand}
          title={data.windowOpen ? 'Waiting for workers to raise their hand' : 'Nobody has raised their hand'}
          description="You can assign directly from the register at any time. It’s a normal way to fill a slot."
          action={
            <Button disabled={full} onClick={openDirect}>
              <UserPlus /> Assign directly
            </Button>
          }
        />
      )}

      {data.assigned.length ? (
        <section aria-labelledby="assigned-title" className="space-y-2">
          <h2 id="assigned-title" className="font-display text-lg font-bold">
            Assigned <span className="text-muted-foreground tabular">({data.assigned.length})</span>
          </h2>
          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/45">
                <tr className="text-left">
                  <th className="ledger-label h-9 px-4 font-semibold">Account</th>
                  <th className="ledger-label h-9 px-3 font-semibold">Worker</th>
                  <th className="ledger-label h-9 px-3 font-semibold">Level</th>
                  <th className="ledger-label h-9 px-3 font-semibold">Status</th>
                  <th className="ledger-label h-9 px-4 text-right font-semibold">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.assigned.map((a) => {
                  const released = RELEASED.has(a.status)
                  return (
                    <tr key={a.id} className="align-top">
                      <td className="px-4 py-2.5 font-medium">
                        {a.handle && a.platform ? accountLabel(a.platform, a.handle) : '—'}
                        {a.overrideReason ? (
                          <span className="mt-0.5 block text-xs font-normal text-warning-foreground dark:text-warning">
                            Override: {a.overrideReason}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{a.workerName}</td>
                      <td className="px-3 py-2.5">{a.level ? <LevelBadge level={a.level} /> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Money paise={a.payoutAmount} className={cn('font-display font-bold', released && 'ledger-struck text-muted-foreground')} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                    Committed, excluding released slots
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Money paise={committed} className="font-display font-bold" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      ) : null}

      <DirectAssignDialog
        gigId={gigId}
        open={directOpen}
        onOpenChange={setDirectOpen}
        onPick={(t) => {
          setDirectOpen(false)
          setTarget(t)
        }}
      />
      <AssignDialog gigId={gigId} gigTitle={g.title} target={target} direct={direct} onOpenChange={(o) => !o && setTarget(null)} />
    </div>
  )
}
