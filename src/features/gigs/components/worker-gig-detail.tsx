import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, ExternalLink, Lock, ShieldCheck, Hand, Sparkles, Timer, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { CopyButton } from '@/components/shared/copy-button'
import { Countdown } from '@/components/shared/countdown'
import { PlatformLabel } from '@/components/shared/platform-icon'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { useAction } from '@/hooks/use-action'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { expressInterest, withdrawInterest } from '@/features/opportunities/server/interest'
import type { getGigForWorker } from '../server/worker-gigs'
import { NextLevelLine, PayAmount, payCaption } from './pay'
import { formatHours, slotsLeft, TASK_TYPE_LABELS } from './worker-gig-meta'

type GigDetailData = Awaited<ReturnType<typeof getGigForWorker>>

/** A ruled section of the gig page; sections stack inside one bordered panel. */
function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="px-4 py-4 sm:px-5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Requirement({ ok, children }: { ok: boolean | null; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 py-2.5 text-sm first:pt-0 last:pb-0">
      {ok === false ? (
        <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Not eligible" />
      ) : (
        <Check
          className={cn('mt-0.5 size-4 shrink-0', ok ? 'text-success' : 'text-muted-foreground')}
          aria-label={ok ? 'Eligible' : undefined}
        />
      )}
      <span className="min-w-0">{children}</span>
    </li>
  )
}

/** Key figures as cells of one ledger row. */
function Facts({ items, className }: { items: { k: string; v: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border', className)}>
      {items.map((it) => (
        <div key={it.k} className="bg-card px-3 py-2.5 odd:last:col-span-2">
          <dt className="ledger-label">{it.k}</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular">{it.v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function WorkerGigDetail({ data }: { data: GigDetailData }) {
  const { gig, mySubmission, ineligible, interest, myAccounts, pay } = data
  const [confirmOpen, setConfirmOpen] = useState(false)
  const eligibleAccounts = myAccounts.filter((a) => a.ok)
  const [offered, setOffered] = useState<string[]>([])
  const left = slotsLeft(gig)
  const windowOpen = gig.interestClosesAt ? new Date(gig.interestClosesAt) > new Date() : false

  const interested = useAction((accountIds: string[]) => expressInterest({ data: { gigId: gig.id, accountIds } }), {
    success: 'You’re in the running. We’ll notify you if you’re selected.',
    invalidate: [['w']],
    onSuccess: () => setConfirmOpen(false),
    onError: () => setConfirmOpen(false),
  })
  const withdraw = useAction(() => withdrawInterest({ data: { gigId: gig.id } }), {
    success: 'Interest withdrawn',
    invalidate: [['w']],
  })

  const needs = [
    gig.minKarma > 0 ? `${gig.minKarma.toLocaleString('en-IN')}+ karma` : null,
    gig.minAccountAgeMonths > 0 ? `an account ${gig.minAccountAgeMonths}+ months old` : null,
  ].filter(Boolean)
  const states = gig.allowedStates ?? []

  const startInterest = () => {
    setOffered(eligibleAccounts.map((a) => a.id))
    setConfirmOpen(true)
  }

  /** The one action this gig offers right now. `compact` is the phone action bar version. */
  const renderCta = (compact: boolean) =>
    mySubmission ? (
      <Button asChild size="lg" className="w-full">
        <Link to="/w/work/$submissionId" params={{ submissionId: mySubmission.id }}>
          Open your task <ArrowRight />
        </Link>
      </Button>
    ) : interest?.status === 'interested' ? (
      <div className={cn('flex gap-2', compact ? 'items-center justify-end' : 'flex-col')}>
        <p
          className={cn(
            'flex items-center gap-1.5 text-sm font-semibold text-success',
            !compact && 'rounded-md border border-success/40 bg-success/8 px-3 py-2.5',
          )}
        >
          <Check className="size-4" /> In the running
        </p>
        <Button
          variant={compact ? 'outline' : 'ghost'}
          size="sm"
          className={cn('text-muted-foreground', !compact && 'w-full')}
          disabled={withdraw.isPending}
          onClick={() => withdraw.mutate(undefined)}
        >
          {withdraw.isPending ? <Spinner /> : null}
          Withdraw{compact ? '' : ' interest'}
        </Button>
      </div>
    ) : interest?.status === 'not_selected' ? (
      <Button size="lg" variant="secondary" className="w-full" disabled>
        Filled: another account was picked
      </Button>
    ) : ineligible ? (
      <Button size="lg" variant="secondary" className="w-full" disabled>
        <Lock /> Not available yet
      </Button>
    ) : (
      <Button size="lg" className="w-full" onClick={startInterest} disabled={interested.isPending}>
        {interested.isPending ? <Spinner /> : <Hand />}
        I’m interested
      </Button>
    )

  const facts: { k: string; v: ReactNode }[] = [
    { k: 'Time to finish', v: `${formatHours(gig.claimWindowHours)} after selection` },
    { k: 'Live check', v: gig.liveHoldHours > 0 ? `Stay up ${formatHours(gig.liveHoldHours)}` : 'None' },
    { k: 'Slots left', v: `${left} of ${gig.totalSlots}` },
  ]
  if (gig.endsAt)
    facts.push({
      k: 'Gig closes',
      v: <Countdown to={gig.endsAt} prefix="In" className="text-sm font-semibold text-foreground" />,
    })

  const statusNote = mySubmission ? (
    <div className="flex items-start gap-2.5 rounded-md border border-ink/25 bg-ink/[0.05] px-4 py-3 text-sm">
      <Sparkles className="mt-0.5 size-4 shrink-0 text-ink" />
      <p className="flex-1">You were selected for this gig. Open your task to submit or track it.</p>
    </div>
  ) : interest?.status === 'interested' ? (
    <div className="flex items-start gap-2.5 rounded-md border border-success/30 bg-success/[0.06] px-4 py-3 text-sm">
      <Hand className="mt-0.5 size-4 shrink-0 text-success" />
      <p className="flex-1">
        You’re in the running. Our team picks the best-fit account for each slot and you’ll get a notification if you’re selected.
      </p>
    </div>
  ) : interest?.status === 'not_selected' ? (
    <div className="flex items-start gap-2.5 rounded-md border bg-muted/60 px-4 py-3 text-sm">
      <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p className="flex-1">Another account was picked for this one. Keep an eye on Gigs for the next.</p>
    </div>
  ) : ineligible ? (
    <div className="flex items-start gap-2.5 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <Lock className="mt-0.5 size-4 shrink-0 text-warning-foreground dark:text-warning" />
      <p className="flex-1">
        <span className="font-semibold">Not available yet. </span>
        {ineligible}
      </p>
    </div>
  ) : windowOpen && gig.interestClosesAt ? (
    <div className="flex items-start gap-2.5 rounded-md border border-primary/25 bg-primary/[0.05] px-4 py-3 text-sm">
      <Hand className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="flex-1">
        <span className="font-semibold">Interest is open now. </span>
        Tap “I’m interested” before it closes. <Countdown to={gig.interestClosesAt} prefix="Closes" className="text-primary" />
      </p>
    </div>
  ) : null

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground">
        <Link to="/w/gigs">
          <ArrowLeft /> All gigs
        </Link>
      </Button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <header className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <PlatformLabel platform={gig.platform} community={gig.community} />
              <span className="ledger-label rounded-md border px-1 py-px text-[0.62rem]">
                {TASK_TYPE_LABELS[gig.taskType]}
              </span>
              {gig.status !== 'live' ? <StatusBadge status={gig.status} /> : null}
              {mySubmission ? <StatusBadge status={mySubmission.status} /> : null}
            </div>
            <h1 className="font-display text-[1.4rem] leading-tight font-bold text-balance sm:text-[1.85rem]">{gig.title}</h1>
            <div className="lg:hidden">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <PayAmount pay={pay} className="font-display text-[2rem] leading-none font-extrabold" />
                <span className="text-sm text-muted-foreground">{payCaption(pay)}</span>
              </div>
              <NextLevelLine pay={pay} className="mt-1.5" />
            </div>
          </header>

          <Facts items={facts} className="lg:hidden" />

          <div className="divide-y overflow-hidden rounded-lg border bg-card">
            {statusNote}

            <Section title="What to do">
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-pretty">{gig.brief}</div>
              {gig.targetUrl || gig.community ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="ledger-label">{gig.targetUrl ? 'Where to post' : 'Community'}</p>
                    <p className="truncate font-medium">{gig.community || gig.targetUrl}</p>
                  </div>
                  {gig.targetUrl ? (
                    <Button asChild variant="outline" size="sm" className="shrink-0">
                      <a href={gig.targetUrl} target="_blank" rel="noreferrer noopener">
                        Open link <ExternalLink />
                      </a>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </Section>

            {gig.contentGuidelines ? (
              <Section title="Content guidelines">
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-pretty">{gig.contentGuidelines}</div>
              </Section>
            ) : null}

            {gig.sampleContent ? (
              <Section
                title="Sample content"
                action={<CopyButton value={gig.sampleContent} label="Copy" variant="outline" size="sm" />}
              >
                <p className="mb-2 text-xs text-muted-foreground">Use this as inspiration. Write it in your own words.</p>
                <div className="rounded-md border bg-muted/50 p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
                  {gig.sampleContent}
                </div>
              </Section>
            ) : null}

            {gig.reviewChecklist.length ? (
              <Section title="What the reviewer checks">
                <ul className="space-y-2">
                  {gig.reviewChecklist.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            <Section title="Your accounts for this gig">
              {myAccounts.length ? (
                <ul className="divide-y">
                  {myAccounts.map((a) => (
                    <Requirement key={a.id} ok={a.ok}>
                      <span className="font-medium">{a.label}</span>
                      {a.level ? (
                        <span className="text-muted-foreground"> · {a.level === 'warmup' ? 'warm-up' : a.level}</span>
                      ) : null}
                      {a.ok && a.rate ? <span className="font-semibold tabular"> · {formatMoney(a.rate)}</span> : null}
                      {a.reason ? <span className="block text-xs text-muted-foreground">{a.reason}</span> : null}
                    </Requirement>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You don’t have an account on this platform yet.{' '}
                  <Link to="/w/accounts" className="font-medium text-ink underline underline-offset-2">
                    Add one on My accounts
                  </Link>
                  .
                </p>
              )}
              {needs.length || states.length ? (
                <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                  {needs.length ? `Needs ${needs.join(' and ')}. ` : ''}
                  {states.length ? `Open to workers in ${states.join(', ')}.` : ''}
                </p>
              ) : null}
            </Section>

            <Section title="How it works">
              <ol>
                {[
                  <>
                    Tap <strong>I’m interested</strong>
                    {windowOpen ? ' in the next few minutes' : ''}. It doesn’t commit you to anything.
                  </>,
                  <>Our team picks one account per slot. If it’s yours, you’ll get a notification.</>,
                  <>
                    Post from the selected account and submit the link within <strong>{formatHours(gig.claimWindowHours)}</strong>
                    . Reply to comments on your post: it’s part of the task.
                  </>,
                  ...(gig.liveHoldHours > 0
                    ? [
                        <>
                          Keep it live for <strong>{formatHours(gig.liveHoldHours)}</strong>, then upload a screenshot of the
                          post’s insights.
                        </>,
                      ]
                    : []),
                  <>Once approved, the pay goes to your TinyGig balance. Balances are paid to your UPI every week.</>,
                ].map((step, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-[1.75rem_1fr] gap-x-1 border-b py-2.5 text-sm first:pt-0 last:border-b-0 last:pb-0"
                  >
                    <span className="font-display leading-5 font-extrabold text-primary tabular">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Section>
          </div>
        </div>

        <aside className="hidden lg:sticky lg:top-18 lg:block">
          <div className="space-y-4 rounded-lg border bg-card p-5">
            <div>
              <p className="ledger-label">You earn</p>
              <PayAmount pay={pay} className="mt-1 block font-display text-[2.4rem] leading-none font-extrabold" />
              <p className="mt-1.5 text-xs text-muted-foreground">{payCaption(pay)}</p>
              <NextLevelLine pay={pay} className="mt-1" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="ledger-label">Slots left</span>
                <span className="font-semibold tabular">
                  {left} of {gig.totalSlots}
                </span>
              </div>
              <Progress value={gig.totalSlots ? (gig.claimedSlots / gig.totalSlots) * 100 : 100} className="h-1.5" />
            </div>
            <dl className="divide-y border-t text-sm">
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Timer className="size-3.5" /> Time to finish
                </dt>
                <dd className="text-right font-medium">{formatHours(gig.claimWindowHours)} after selection</dd>
              </div>
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <ShieldCheck className="size-3.5" /> Live check
                </dt>
                <dd className="text-right font-medium">
                  {gig.liveHoldHours > 0 ? `Stay up ${formatHours(gig.liveHoldHours)}` : 'None'}
                </dd>
              </div>
              {windowOpen && gig.interestClosesAt ? (
                <div className="flex items-start justify-between gap-3 py-2.5">
                  <dt className="text-muted-foreground">Interest window</dt>
                  <dd>
                    <Countdown to={gig.interestClosesAt} prefix="Closes" />
                  </dd>
                </div>
              ) : null}
              {gig.endsAt ? (
                <div className="flex items-start justify-between gap-3 py-2.5">
                  <dt className="text-muted-foreground">Gig closes</dt>
                  <dd>
                    <Countdown to={gig.endsAt} prefix="Closes" />
                  </dd>
                </div>
              ) : null}
            </dl>
            {renderCta(false)}
          </div>
        </aside>
      </div>

      {/* Phone action bar: pay on the left, the one action on the right, just above the tab bar. */}
      <div className="sticky bottom-[var(--mobile-nav-offset,0px)] z-20 -mx-4 mt-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:-mx-6 sm:px-6 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 shrink-0">
            <PayAmount pay={pay} className="block font-display text-xl leading-none font-extrabold" />
            <div className="mt-1 text-[11px] text-muted-foreground">
              {windowOpen && gig.interestClosesAt && !mySubmission ? (
                <Countdown to={gig.interestClosesAt} prefix="Closes" className="text-[11px]" />
              ) : (
                <span className="tabular">{left} slots left</span>
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">{renderCta(true)}</div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !interested.isPending && setConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Interested in this gig?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This reserves nothing. Our team picks one account per slot. If it’s yours, you’ll have{' '}
                  <strong className="text-foreground">{formatHours(gig.claimWindowHours)}</strong> to post and submit the link.
                </p>
                {eligibleAccounts.length > 1 ? (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Accounts you can offer</p>
                    {eligibleAccounts.map((a) => (
                      <div key={a.id} className="flex items-center gap-2.5">
                        <Checkbox
                          id={`offer-${a.id}`}
                          checked={offered.includes(a.id)}
                          onCheckedChange={(v) => setOffered((o) => (v ? [...o, a.id] : o.filter((x) => x !== a.id)))}
                        />
                        <label htmlFor={`offer-${a.id}`} className="text-foreground">
                          {a.label}
                          {a.level ? <span className="text-muted-foreground"> · {a.level}</span> : null}
                          {a.rate ? <span className="text-muted-foreground"> · {formatMoney(a.rate)}</span> : null}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={interested.isPending}>Not now</AlertDialogCancel>
            <AlertDialogAction
              disabled={interested.isPending || !offered.length}
              onClick={(e) => {
                e.preventDefault()
                interested.mutate(offered)
              }}
            >
              {interested.isPending ? <Spinner /> : null}
              Yes, I’m interested
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
