import { useQuery } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  ExternalLink,
  Lock,
  ShieldCheck,
  Sparkles,
  Timer,
  X,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { CopyButton } from '@/components/shared/copy-button'
import { Countdown } from '@/components/shared/countdown'
import { Money } from '@/components/shared/money'
import { PlatformLabel } from '@/components/shared/platform-icon'
import { formatDateTime } from '@/components/shared/relative-time'
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
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { myProfileQuery } from '@/features/workers/queries'
import { useAction } from '@/hooks/use-action'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { claimGig, type getGigForWorker } from '../server/worker-gigs'
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
  const { gig, mySubmission, ineligible } = data
  const router = useRouter()
  const { data: profile } = useQuery(myProfileQuery())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const left = slotsLeft(gig)
  const deadlinePreview = new Date(Date.now() + gig.claimWindowHours * 3_600_000)

  const claim = useAction(() => claimGig({ data: { gigId: gig.id } }), {
    success: 'Gig claimed! Your task is ready.',
    invalidate: [['w']],
    onSuccess: async (r) => {
      setConfirmOpen(false)
      await router.navigate({ to: '/w/work/$submissionId', params: { submissionId: r.submissionId } })
    },
    onError: () => setConfirmOpen(false),
  })

  const cta = mySubmission ? (
    <Button asChild size="lg" className="w-full">
      <Link to="/w/work/$submissionId" params={{ submissionId: mySubmission.id }}>
        Open your task <ArrowRight />
      </Link>
    </Button>
  ) : ineligible ? (
    <Button size="lg" className="w-full" disabled>
      <Lock /> {ineligible}
    </Button>
  ) : (
    <Button size="lg" className="w-full" onClick={() => setConfirmOpen(true)} disabled={claim.isPending}>
      {claim.isPending ? <Spinner /> : null}
      Claim this gig · <Money paise={gig.payoutAmount} />
    </Button>
  )

  const allowedStates = gig.allowedStates ?? []

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
              <p className="flex-1">You already claimed this gig. Open your task to submit or track it.</p>
            </div>
          ) : ineligible ? (
            <div className="flex items-center gap-3 rounded-xl border bg-muted/60 p-4 text-sm">
              <Lock className="size-4 shrink-0 text-muted-foreground" />
              <p className="flex-1">
                <span className="font-medium">You can't claim this gig: </span>
                {ineligible}.
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

          <Section title="Who can do this">
            <ul className="space-y-2.5">
              <Requirement ok={profile ? profile.karma >= gig.minKarma : null}>
                {gig.minKarma > 0 ? `${formatNumber(gig.minKarma)}+ Reddit karma` : 'Any karma'}
                {profile ? <span className="text-muted-foreground"> (you have {formatNumber(profile.karma)})</span> : null}
              </Requirement>
              <Requirement ok={profile ? profile.accountAgeMonths >= gig.minAccountAgeMonths : null}>
                {gig.minAccountAgeMonths > 0 ? `Account at least ${gig.minAccountAgeMonths} months old` : 'Any account age'}
                {profile ? <span className="text-muted-foreground"> (yours: {profile.accountAgeMonths} months)</span> : null}
              </Requirement>
              <Requirement ok={profile ? !allowedStates.length || allowedStates.includes(profile.state) : null}>
                {allowedStates.length ? `Only in: ${allowedStates.join(', ')}` : 'Open to all states in India'}
              </Requirement>
            </ul>
          </Section>

          <Section title="Steps">
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">1</span>
                <span>
                  Claim, then post and submit the link within <strong>{formatHours(gig.claimWindowHours)}</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">2</span>
                <span>We review it.</span>
              </li>
              {gig.liveHoldHours > 0 ? (
                <li className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">3</span>
                  <span>
                    Keep the post up for <strong>{formatHours(gig.liveHoldHours)}</strong>.
                  </span>
                </li>
              ) : null}
              <li className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                  {gig.liveHoldHours > 0 ? 4 : 3}
                </span>
                <span>
                  Get <Money paise={gig.payoutAmount} /> on UPI.
                </span>
              </li>
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
                <dd className="text-right font-medium">{formatHours(gig.claimWindowHours)} after claim</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <ShieldCheck className="size-3.5" /> Live check
                </dt>
                <dd className="text-right font-medium">{gig.liveHoldHours > 0 ? `Stay up ${formatHours(gig.liveHoldHours)}` : 'None'}</dd>
              </div>
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
      <div className="sticky bottom-0 z-20 -mx-3 mt-4 border-t bg-background/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatHours(gig.claimWindowHours)} to finish
            {gig.liveHoldHours > 0 ? ` · stay live ${formatHours(gig.liveHoldHours)}` : ''}
          </span>
          <span className="tabular">{left} slots left</span>
        </div>
        {cta}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !claim.isPending && setConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Claim this gig?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  You'll have <strong className="text-foreground">{formatHours(gig.claimWindowHours)}</strong> to post and submit your
                  proof link, until about <strong className="text-foreground">{formatDateTime(deadlinePreview)}</strong>.
                </p>
                <p>If you don't submit in time, the slot goes back to other workers. Only claim if you can do it now.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={claim.isPending}>Not now</AlertDialogCancel>
            <AlertDialogAction
              disabled={claim.isPending}
              onClick={(e) => {
                e.preventDefault()
                claim.mutate(undefined)
              }}
            >
              {claim.isPending ? <Spinner /> : null}
              Yes, claim it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
