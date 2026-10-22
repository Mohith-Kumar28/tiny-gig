import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  ExternalLink,
  Lock,
  ShieldCheck,
  Hand,
  Sparkles,
  Timer,
  X,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { CopyButton } from '@/components/shared/copy-button'
import { Countdown } from '@/components/shared/countdown'
import { Money } from '@/components/shared/money'
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
import { cn } from '@/lib/utils'
import { expressInterest, withdrawInterest } from '@/features/opportunities/server/interest'
import type { getGigForWorker } from '../server/worker-gigs'
import { formatHours, slotsLeft, TASK_TYPE_LABELS } from './worker-gig-meta'

type GigDetailData = Awaited<ReturnType<typeof getGigForWorker>>

function Section({ title, icon: Icon, children, action }: { title: string; icon?: typeof Check; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Requirement({ ok, children }: { ok: boolean | null; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
          ok === null ? 'bg-muted text-muted-foreground' : ok ? 'bg-success/15 text-success' : 'bg-destructive/12 text-destructive',
        )}
      >
        {ok === false ? <X className="size-3" /> : <Check className="size-3" />}
      </span>
      <span className={cn(ok === false && 'text-destructive')}>{children}</span>
    </li>
  )
}

export function WorkerGigDetail({ data }: { data: GigDetailData }) {
  const { gig, mySubmission, ineligible, interest, myAccounts } = data
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
  const withdraw = useAction(() => withdrawInterest({ data: { gigId: gig.id } }), { success: 'Interest withdrawn', invalidate: [['w']] })

  const cta = mySubmission ? (
    <Button asChild size="lg" className="w-full">
      <Link to="/w/work/$submissionId" params={{ submissionId: mySubmission.id }}>
        Open your task <ArrowRight />
      </Link>
    </Button>
  ) : interest?.status === 'interested' ? (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm font-medium text-success">
        <Check className="size-4" /> You’re in the running
      </div>
      <Button variant="ghost" size="sm" className="w-full text-muted-foreground" disabled={withdraw.isPending} onClick={() => withdraw.mutate(undefined)}>
        Withdraw interest
      </Button>
    </div>
  ) : interest?.status === 'not_selected' ? (
    <Button size="lg" className="w-full" disabled>
      Filled: another account was picked
    </Button>
  ) : ineligible ? (
    <Button size="lg" className="w-full" disabled>
      <Lock /> Not available yet
    </Button>
  ) : (
    <Button
      size="lg"
      className="w-full"
      onClick={() => {
        setOffered(eligibleAccounts.map((a) => a.id))
        setConfirmOpen(true)
      }}
      disabled={interested.isPending}
    >
      {interested.isPending ? <Spinner /> : <Hand />}
      I’m interested
    </Button>
  )


  return (
    <div className="pb-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground">
        <Link to="/w/gigs">
          <ArrowLeft /> All gigs
        </Link>
      </Button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <PlatformLabel platform={gig.platform} community={gig.community} />
              <span aria-hidden>·</span>
              <span className="text-sm">{TASK_TYPE_LABELS[gig.taskType]}</span>
              {gig.status !== 'live' ? <StatusBadge status={gig.status} /> : null}
              {mySubmission ? <StatusBadge status={mySubmission.status} /> : null}
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{gig.title}</h1>
            <div className="flex items-baseline gap-2 lg:hidden">
              <Money paise={gig.payoutAmount} className="font-display text-3xl font-semibold text-primary" />
              <span className="text-sm text-muted-foreground">
                · {left} of {gig.totalSlots} slots left
              </span>
            </div>
          </header>

          {mySubmission ? (
            <div className="flex items-center gap-3 rounded-xl border border-info/30 bg-info/8 p-4 text-sm">
              <Sparkles className="size-4 shrink-0 text-info" />
              <p className="flex-1">You were selected for this gig. Open your task to submit or track it.</p>
            </div>
          ) : interest?.status === 'interested' ? (
            <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/8 p-4 text-sm">
              <Hand className="size-4 shrink-0 text-success" />
              <p className="flex-1">
                You’re in the running. Our team picks the best-fit account for each slot and you’ll get a notification if you’re selected.
              </p>
            </div>
          ) : ineligible ? (
            <div className="flex items-center gap-3 rounded-xl border bg-muted/60 p-4 text-sm">
              <Lock className="size-4 shrink-0 text-muted-foreground" />
              <p className="flex-1">
                <span className="font-medium">Not available yet: </span>
                {ineligible}
              </p>
            </div>
          ) : null}

          <Section title="What to do" icon={ClipboardList}>
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-pretty">{gig.brief}</div>
            {gig.targetUrl || gig.community ? (
              <div className="mt-4 flex flex-col gap-2 rounded-lg bg-muted/60 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{gig.targetUrl ? 'Where to post' : 'Community'}</p>
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
            <Section title="Sample content" action={<CopyButton value={gig.sampleContent} label="Copy" variant="outline" size="sm" />}>
              <p className="mb-2 text-xs text-muted-foreground">Use this as inspiration. Write it in your own words.</p>
              <div className="rounded-lg border bg-muted/50 p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
                {gig.sampleContent}
              </div>
            </Section>
          ) : null}

          {gig.reviewChecklist.length ? (
            <Section title="What the reviewer checks" icon={ShieldCheck}>
              <ul className="space-y-2">
                {gig.reviewChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title="Your accounts for this gig">
            {myAccounts.length ? (
              <ul className="space-y-2.5">
                {myAccounts.map((a) => (
                  <Requirement key={a.id} ok={a.ok}>
                    <span className="font-medium">{a.label}</span>
                    {a.level ? <span className="text-muted-foreground"> · {a.level === 'warmup' ? 'warm-up' : a.level}</span> : null}
                    {a.reason ? <span className="block text-xs text-muted-foreground">{a.reason}</span> : null}
                  </Requirement>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                You don’t have an account on this platform yet.{' '}
                <Link to="/w/accounts" className="font-medium text-foreground underline underline-offset-2">
                  Add one
                </Link>
                .
              </p>
            )}
            {gig.minKarma > 0 || gig.minAccountAgeMonths > 0 || (gig.allowedStates ?? []).length ? (
              <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                Needs{gig.minKarma > 0 ? ` ${gig.minKarma.toLocaleString('en-IN')}+ karma` : ''}
                {gig.minAccountAgeMonths > 0 ? `${gig.minKarma > 0 ? ',' : ''} an account ${gig.minAccountAgeMonths}+ months old` : ''}
                {(gig.allowedStates ?? []).length ? ` · only in ${(gig.allowedStates ?? []).join(', ')}` : ''}.
              </p>
            ) : null}
          </Section>

          <Section title="Steps">
            <ol className="space-y-3 text-sm">
              {[
                <>
                  Tap <strong>I’m interested</strong>{windowOpen ? ' in the next few minutes' : ''}. It doesn’t commit you to anything.
                </>,
                <>Our team picks one account per slot. If it’s yours, you’ll get a notification.</>,
                <>
                  Post from the selected account and submit the link within <strong>{formatHours(gig.claimWindowHours)}</strong>. Reply to comments on
                  your post: it’s part of the task.
                </>,
                ...(gig.liveHoldHours > 0
                  ? [
                      <>
                        Keep it live for <strong>{formatHours(gig.liveHoldHours)}</strong>, then upload a screenshot of the post’s insights.
                      </>,
                    ]
                  : []),
                <>Once approved, the pay goes to your TinyGig balance. Balances are paid to your UPI every week.</>,
              ].map((step, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static list
                <li key={i} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <aside className="hidden lg:sticky lg:top-18 lg:block">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">You earn</p>
              <Money paise={gig.payoutAmount} className="font-display text-4xl font-semibold text-primary" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Slots left</span>
                <span className="font-medium tabular">
                  {left} of {gig.totalSlots}
                </span>
              </div>
              <Progress value={gig.totalSlots ? (gig.claimedSlots / gig.totalSlots) * 100 : 100} className="h-1.5" />
            </div>
            <dl className="space-y-2.5 border-t pt-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Timer className="size-3.5" /> Time to finish
                </dt>
                <dd className="text-right font-medium">{formatHours(gig.claimWindowHours)} after selection</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <ShieldCheck className="size-3.5" /> Live check
                </dt>
                <dd className="text-right font-medium">{gig.liveHoldHours > 0 ? `Stay up ${formatHours(gig.liveHoldHours)}` : 'None'}</dd>
              </div>
              {windowOpen && gig.interestClosesAt ? (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Interest window</dt>
                  <dd>
                    <Countdown to={gig.interestClosesAt} prefix="Closes" />
                  </dd>
                </div>
              ) : null}
              {gig.endsAt ? (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Gig closes</dt>
                  <dd>
                    <Countdown to={gig.endsAt} prefix="Closes" />
                  </dd>
                </div>
              ) : null}
            </dl>
            {cta}
          </div>
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div className="sticky bottom-[var(--mobile-nav-offset,0px)] z-20 -mx-3 mt-4 border-t bg-background/95 px-3 pt-3 pb-3 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatHours(gig.claimWindowHours)} to finish
            {gig.liveHoldHours > 0 ? ` · stay live ${formatHours(gig.liveHoldHours)}` : ''}
          </span>
          <span className="tabular">{left} slots left</span>
        </div>
        {cta}
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
