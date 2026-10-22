import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Ban, Hand, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Countdown } from '@/components/shared/countdown'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { PLATFORM_LABELS, PlatformIcon } from '@/components/shared/platform-icon'
import { formatDate, RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { WhatsAppIcon, whatsappLink } from '@/components/shared/whatsapp-icon'
import { Button } from '@/components/ui/button'
import { LevelBadge } from '@/features/accounts/components/account-columns'
import { isKarmaStale } from '@/features/accounts/rules'
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

function Fact({ label, children, muted }: { label: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <div className={cn('min-w-0', muted && 'opacity-50')}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-medium tabular">{children}</div>
    </div>
  )
}

/** §4.2 — the screen that decides adoption. Facts side by side, best fit first, the reason in words. */
function SelectPage() {
  const { gigId } = Route.useParams()
  const { data } = useSuspenseQuery(selectionQuery(gigId))
  const [target, setTarget] = useState<AssignTarget | null>(null)
  const [direct, setDirect] = useState(false)
  const [directOpen, setDirectOpen] = useState(false)
  const g = data.gig
  const full = g.slotsLeft === 0

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 text-muted-foreground">
          <Link to="/admin/gigs/$gigId" params={{ gigId }}>
            <ArrowLeft /> {g.title}
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Pick accounts</h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <PlatformIcon platform={g.platform} /> {PLATFORM_LABELS[g.platform]}
                {g.community ? ` · ${g.community}` : ''}
              </span>
              <span>
                <strong className="text-foreground tabular">{g.slotsLeft}</strong> of {g.totalSlots} slots open
              </span>
              <span>{formatNumber(data.counts.interested)} interested</span>
              {data.windowOpen && g.interestClosesAt ? (
                <Countdown to={g.interestClosesAt} prefix="Window closes" />
              ) : g.interestClosesAt ? (
                <span>window closed {formatDate(g.interestClosesAt)}</span>
              ) : null}
            </p>
          </div>
          <Button
            variant="outline"
            disabled={full}
            onClick={() => {
              setDirect(true)
              setDirectOpen(true)
            }}
          >
            <UserPlus /> Assign directly
          </Button>
        </div>
      </div>

      {full ? (
        <div className="rounded-xl border border-success/30 bg-success/8 p-4 text-sm">All slots are filled.</div>
      ) : null}

      {data.candidates.length ? (
        <ol className="space-y-3">
          {data.candidates.map((c, i) => {
            const stale = isKarmaStale(c.karmaUpdatedAt, 30)
            return (
              <li
                key={c.accountId}
                className={cn(
                  'rounded-xl border bg-card p-4',
                  c.hard.length ? 'opacity-60' : c.soft.length ? 'border-warning/40' : i === 0 && 'border-primary/40 ring-1 ring-primary/15',
                )}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular">{i + 1}</span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold">
                      {c.label} <span className="font-normal text-muted-foreground">· {c.workerName}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{c.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.phone ? (
                      <Button asChild variant="ghost" size="icon" className="size-8" aria-label={`WhatsApp ${c.workerName}`}>
                        <a href={whatsappLink(c.phone, `Hi ${c.workerName.split(' ')[0]}, about “${g.title}” on ${c.label} — `)} target="_blank" rel="noreferrer noopener">
                          <WhatsAppIcon />
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant={c.ok ? 'default' : 'outline'}
                      disabled={full || c.hard.length > 0}
                      onClick={() => {
                        setDirect(false)
                        setTarget({ accountId: c.accountId, label: c.label, workerName: c.workerName, hard: c.hard, soft: c.soft })
                      }}
                    >
                      Select
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 sm:grid-cols-3 lg:grid-cols-6">
                  <Fact label="Level">
                    <LevelBadge level={c.facts.level} />
                  </Fact>
                  <Fact label={`Karma${c.karmaUpdatedAt ? ` · ${formatDate(c.karmaUpdatedAt)}` : ''}`} muted={stale}>
                    {c.facts.karma == null ? '—' : formatNumber(c.facts.karma)}
                  </Fact>
                  <Fact label="Last client post">{c.facts.daysSinceClientWork == null ? 'never' : `${c.facts.daysSinceClientWork}d ago`}</Fact>
                  <Fact label="Last client">{c.lastClient ?? '—'}</Fact>
                  <Fact label="This community">{c.facts.lastInCommunityAt ? formatDate(c.facts.lastInCommunityAt) : 'never'}</Fact>
                  <Fact label="Approved / rejected">
                    {c.facts.approved} / {c.facts.rejected}
                  </Fact>
                </div>
                {c.hard.length || c.soft.length ? (
                  <ul className="mt-3 space-y-1 text-xs">
                    {c.hard.map((b) => (
                      <li key={b.rule} className="flex gap-1.5 text-destructive">
                        <Ban className="mt-px size-3.5 shrink-0" /> {b.message}
                      </li>
                    ))}
                    {c.soft.map((b) => (
                      <li key={b.rule} className="flex gap-1.5 text-warning-foreground dark:text-warning">
                        <AlertTriangle className="mt-px size-3.5 shrink-0" /> {b.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Interested <RelativeTime date={c.interestedAt} />
                </p>
              </li>
            )
          })}
        </ol>
      ) : full ? null : (
        <EmptyState
          icon={Hand}
          title={data.windowOpen ? 'Waiting for workers to raise their hand' : 'Nobody has raised their hand'}
          description="You can assign directly from the register at any time. It’s a normal way to fill a slot."
          action={
            <Button
              disabled={full}
              onClick={() => {
                setDirect(true)
                setDirectOpen(true)
              }}
            >
              <UserPlus /> Assign directly
            </Button>
          }
        />
      )}

      {data.assigned.length ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Assigned ({data.assigned.length})</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {data.assigned.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
                <span className="font-medium">{a.handle ? `u/${a.handle}` : '—'}</span>
                <span className="text-muted-foreground">{a.workerName}</span>
                {a.level ? <LevelBadge level={a.level} /> : null}
                <Money paise={a.payoutAmount} />
                <StatusBadge status={a.status} />
                {a.overrideReason ? <span className="text-xs text-warning-foreground dark:text-warning">Override: {a.overrideReason}</span> : null}
              </li>
            ))}
          </ul>
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
