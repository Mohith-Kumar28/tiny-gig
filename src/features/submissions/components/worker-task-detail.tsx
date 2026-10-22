import { Link, useRouter } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Hourglass,
  type Info,
  ShieldCheck,
  Undo2,
  Upload,
  XCircle,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Spinner } from '@/components/ui/spinner'
import { formatHours } from '@/features/gigs/components/worker-gig-meta'
import { formatMoney } from '@/lib/format'
import { useAction } from '@/hooks/use-action'
import { cn } from '@/lib/utils'
import { type getMySubmission, withdrawClaim } from '../server/worker-submissions'
import { AccountLossNotice } from '@/features/consent/components/account-loss-notice'
import { canWithdraw, isTwoStep } from '../state'
import { InsightsForm } from './insights-form'
import { ProofForm } from './proof-form'
import { StatusStepper } from './status-stepper'
import { SubmissionTimeline } from './submission-timeline'

type TaskData = Awaited<ReturnType<typeof getMySubmission>>

/** One ruled section of the task page. Sections stack inside a single bordered panel. */
function Section({
  title,
  children,
  className,
  action,
}: {
  title?: ReactNode
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <section className={cn('px-4 py-4 sm:px-5', className)}>
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

/** "What happens next": the one block that says where the task stands, marked by a coloured margin rule. */
function NextStep({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: 'warning' | 'info' | 'success' | 'danger'
  icon: typeof Info
  title: ReactNode
  children?: ReactNode
}) {
  return (
    <section
      className={cn(
        'px-4 py-4 sm:px-5',
        tone === 'warning' && 'bg-warning/10',
        tone === 'info' && 'bg-ink/[0.05]',
        tone === 'success' && 'bg-success/[0.06]',
        tone === 'danger' && 'bg-destructive/[0.05]',
      )}
    >
      <div className="flex gap-2.5">
        <Icon
          className={cn(
            'mt-0.5 size-4.5 shrink-0',
            tone === 'warning' && 'text-warning-foreground dark:text-warning',
            tone === 'info' && 'text-ink',
            tone === 'success' && 'text-success',
            tone === 'danger' && 'text-destructive',
          )}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="font-display text-base leading-snug font-bold">{title}</h2>
          {children}
        </div>
      </div>
    </section>
  )
}

function Row({ k, children }: { k: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="ledger-label">{k}</dt>
      <dd className="text-right text-sm tabular">{children}</dd>
    </div>
  )
}

function Thumbs({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {keys.map((k, i) => (
        <a
          key={k}
          href={`/api/uploads/${k}`}
          target="_blank"
          rel="noreferrer"
          className="aspect-square overflow-hidden rounded-md border bg-muted transition-opacity hover:opacity-85 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <img src={`/api/uploads/${k}`} alt={`${label} ${i + 1}`} className="size-full object-cover" loading="lazy" />
        </a>
      ))}
    </div>
  )
}

export function WorkerTaskDetail({ data }: { data: TaskData }) {
  const { submission: sub, gig, events, account } = data
  const twoStep = isTwoStep(sub)
  const holdOver = sub.status === 'on_hold' && (!sub.liveCheckAt || new Date(sub.liveCheckAt).getTime() <= Date.now())
  const router = useRouter()
  const [briefOpen, setBriefOpen] = useState(sub.status === 'claimed')
  const status = sub.status
  const needsProof = status === 'claimed' || status === 'changes_requested'
  const overdue = new Date(sub.dueAt).getTime() < Date.now()
  const hasSubmitted = events.some((e) => e.action === 'submitted' || e.action === 'resubmitted')
  const lastAdmin = [...events]
    .reverse()
    .find((e) => e.actorRole === 'admin' && (e.action === 'changes_requested' || e.action === 'rejected'))

  const withdraw = useAction(() => withdrawClaim({ data: { id: sub.id } }), {
    success: 'You withdrew from this gig. The slot is free for others.',
    invalidate: [['w']],
    onSuccess: async () => {
      await router.navigate({ to: '/w/work', search: { tab: 'closed' } })
    },
  })

  const closed = status === 'rejected' || status === 'expired' || status === 'withdrawn'

  const nextStep =
    status === 'on_hold' && !holdOver && sub.liveCheckAt ? (
      <NextStep tone="info" icon={ShieldCheck} title="Link received. Keep your post live.">
        <p className="text-sm leading-relaxed">
          Don’t delete or edit it, and reply to comments. Once it has been live until{' '}
          <strong>{formatDateTime(sub.liveCheckAt)}</strong>, upload a screenshot of its insights here.
        </p>
        <Countdown to={sub.liveCheckAt} prefix="Insights due" className="text-sm text-ink" />
      </NextStep>
    ) : status === 'on_hold' && holdOver ? (
      <NextStep tone="warning" icon={Upload} title="Last step: upload your insights screenshot">
        <p className="text-sm leading-relaxed">
          Your post has been live for the full hold. Send a screenshot of its insights so we can see it survived and got real
          views.
        </p>
      </NextStep>
    ) : status === 'in_review' ? (
      <NextStep tone="info" icon={Hourglass} title="Insights received. Waiting for review.">
        <p className="text-sm text-muted-foreground">
          Once approved, <Money paise={sub.payoutAmount} className="font-semibold text-foreground" /> goes to your TinyGig
          balance. You’ll get a notification.
        </p>
      </NextStep>
    ) : status === 'changes_requested' ? (
      <NextStep tone="warning" icon={AlertTriangle} title="The reviewer asked for changes">
        {lastAdmin?.comment ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{lastAdmin.comment}</p> : null}
        {lastAdmin?.checklist?.length ? (
          <div className="space-y-1.5">
            <p className="ledger-label">Please fix</p>
            <ul className="space-y-1.5">
              {lastAdmin.checklist.map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm">
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">Fix your post, then resubmit below.</p>
      </NextStep>
    ) : status === 'rejected' ? (
      <NextStep tone="danger" icon={XCircle} title="This task was not approved">
        {lastAdmin?.comment ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{lastAdmin.comment}</p> : null}
        <p className="text-sm text-muted-foreground">
          No payment for this one. Check the reason, then{' '}
          <Link to="/w/gigs" className="font-medium text-ink underline underline-offset-2">
            find another gig
          </Link>
          .
        </p>
      </NextStep>
    ) : status === 'live_check' ? (
      <NextStep tone="info" icon={ShieldCheck} title="Passed review. Keep your post live.">
        <p className="text-sm leading-relaxed">
          Don't delete or edit your post. We'll check it is still up
          {sub.liveCheckAt ? (
            <>
              {' '}
              on <strong>{formatDateTime(sub.liveCheckAt)}</strong>
            </>
          ) : null}
          , then approve your payment.
        </p>
        {sub.liveCheckAt && new Date(sub.liveCheckAt).getTime() > Date.now() ? (
          <Countdown to={sub.liveCheckAt} prefix="Final check" className="text-sm text-ink" />
        ) : sub.liveCheckAt ? (
          <p className="text-sm font-medium text-ink">The hold time is over. We'll do the final check and approve soon.</p>
        ) : null}
      </NextStep>
    ) : status === 'submitted' || status === 'resubmitted' ? (
      <NextStep tone="info" icon={Hourglass} title="Submitted. Waiting for review.">
        <p className="text-sm text-muted-foreground">
          Our team usually reviews within a day. You'll get an email and a notification when there's an update.
        </p>
      </NextStep>
    ) : status === 'approved' ? (
      <NextStep
        tone="success"
        icon={CheckCircle2}
        title={
          <>
            Approved. <Money paise={sub.payoutAmount} className="font-bold" /> earned
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          {sub.payoutId
            ? 'This was included in a payout.'
            : 'It’s in your TinyGig balance. Balances are paid to your UPI every week.'}{' '}
          <Link to="/w/payments" className="font-medium text-ink underline underline-offset-2">
            See earnings
          </Link>
        </p>
      </NextStep>
    ) : status === 'expired' ? (
      <NextStep tone="danger" icon={Clock} title="The deadline passed">
        <p className="text-sm text-muted-foreground">
          This task expired because proof wasn’t submitted in time.{' '}
          <Link to="/w/gigs" className="font-medium text-ink underline underline-offset-2">
            Find another gig
          </Link>
          .
        </p>
      </NextStep>
    ) : null

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to="/w/work">
          <ArrowLeft /> My work
        </Link>
      </Button>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <PlatformLabel platform={gig.platform} community={gig.community} />
          <StatusBadge status={status} />
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="min-w-0 font-display text-[1.4rem] leading-tight font-bold text-balance sm:text-[1.65rem]">
            {gig.title}
          </h1>
          <div className="shrink-0 pt-0.5 text-right">
            <p className="font-display text-[1.6rem] leading-none font-extrabold tabular sm:text-[1.85rem]">
              <span className={cn(status === 'approved' && 'ledger-total', closed && 'ledger-struck text-muted-foreground')}>
                {formatMoney(sub.payoutAmount)}
              </span>
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {status === 'approved' ? 'earned' : closed ? 'not paid' : 'on approval'}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 divide-y overflow-hidden rounded-lg border bg-card">
          <Section>
            <StatusStepper
              status={status}
              liveHold={gig.liveHoldHours > 0}
              hasSubmitted={hasSubmitted}
              twoStep={twoStep}
              holdOver={holdOver}
            />
          </Section>

          {nextStep}

          {status === 'on_hold' && holdOver ? (
            <Section>
              <InsightsForm submissionId={sub.id} accountLabel={account?.label} />
            </Section>
          ) : null}

          {needsProof ? (
            <Section
              title={
                twoStep
                  ? status === 'changes_requested'
                    ? 'Resubmit your link'
                    : 'Post, then submit your link'
                  : status === 'changes_requested'
                    ? 'Resubmit your proof'
                    : 'Do the task, then submit proof'
              }
              action={!overdue ? <Countdown to={sub.dueAt} prefix="Due" /> : null}
            >
              {overdue ? (
                <p className="rounded-md border border-destructive/25 bg-destructive/[0.05] px-3 py-2.5 text-sm text-destructive">
                  The deadline for this task has passed, so it can't be submitted anymore.
                </p>
              ) : (
                <div className="space-y-4">
                  {account ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        Post from <strong>{account.label}</strong>. Proof must come from this account. Finish by{' '}
                        <strong>{formatDateTime(sub.dueAt)}</strong>.
                      </p>
                      <AccountLossNotice compact />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Finish by <strong className="text-foreground">{formatDateTime(sub.dueAt)}</strong>. Do the task first, then
                      paste the link here.
                    </p>
                  )}
                  <ProofForm
                    key={`${sub.id}-${sub.revision}`}
                    submissionId={sub.id}
                    platform={gig.platform}
                    resubmit={status === 'changes_requested'}
                    twoStep={twoStep}
                    defaults={{ proofUrl: sub.proofUrl, screenshotKeys: sub.screenshotKeys, workerNote: sub.workerNote }}
                  />
                </div>
              )}
            </Section>
          ) : sub.proofUrl ? (
            <Section title="Your submission">
              <div className="space-y-3">
                <div className="flex items-center gap-1 rounded-md border bg-background py-1 pr-1 pl-3">
                  <a
                    href={sub.proofUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="min-w-0 flex-1 truncate text-sm font-medium text-ink underline-offset-2 hover:underline"
                  >
                    {sub.proofUrl.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                  <CopyButton value={sub.proofUrl} />
                  <Button asChild variant="ghost" size="icon" className="size-8">
                    <a href={sub.proofUrl} target="_blank" rel="noreferrer noopener" aria-label="Open link">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </div>
                {sub.screenshotKeys.length ? <Thumbs keys={sub.screenshotKeys} label="Screenshot" /> : null}
                {sub.workerNote ? (
                  <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm whitespace-pre-wrap text-muted-foreground">{sub.workerNote}</p>
                ) : null}
                {sub.insightsKeys.length ? (
                  <div className="space-y-1.5">
                    <p className="ledger-label">Insights</p>
                    <Thumbs keys={sub.insightsKeys} label="Insights" />
                  </div>
                ) : null}
              </div>
            </Section>
          ) : null}

          <Collapsible open={briefOpen} onOpenChange={setBriefOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none sm:px-5">
              <span className="font-display text-base font-bold">Gig brief</span>
              <ChevronDown
                className={cn('size-4 text-muted-foreground transition-transform duration-200', briefOpen && 'rotate-180')}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 px-4 pb-5 sm:px-5">
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{gig.brief}</div>
              {gig.targetUrl ? (
                <Button asChild variant="outline" size="sm">
                  <a href={gig.targetUrl} target="_blank" rel="noreferrer noopener">
                    Open target link <ExternalLink />
                  </a>
                </Button>
              ) : null}
              {gig.contentGuidelines ? (
                <div className="space-y-1">
                  <h3 className="ledger-label">Content guidelines</h3>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{gig.contentGuidelines}</div>
                </div>
              ) : null}
              {gig.sampleContent ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="ledger-label">Sample content</h3>
                    <CopyButton value={gig.sampleContent} label="Copy" size="sm" />
                  </div>
                  <div className="rounded-md border bg-muted/50 p-3 font-mono text-[13px] whitespace-pre-wrap">
                    {gig.sampleContent}
                  </div>
                </div>
              ) : null}
              {gig.reviewChecklist.length ? (
                <div className="space-y-1.5">
                  <h3 className="ledger-label">What the reviewer checks</h3>
                  <ul className="space-y-1.5">
                    {gig.reviewChecklist.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Link
                to="/w/gigs/$gigId"
                params={{ gigId: gig.id }}
                className="inline-block text-sm font-medium text-ink underline-offset-2 hover:underline"
              >
                View full gig page
              </Link>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-18">
          <div className="divide-y overflow-hidden rounded-lg border bg-card">
            <Section title="Details">
              <dl className="divide-y">
                <Row k={twoStep ? 'Selected' : 'Claimed'}>{formatDateTime(sub.claimedAt)}</Row>
                {needsProof ? <Row k="Deadline">{formatDateTime(sub.dueAt)}</Row> : null}
                {sub.submittedAt ? <Row k="Submitted">{formatDateTime(sub.submittedAt)}</Row> : null}
                {gig.liveHoldHours > 0 ? <Row k="Live check">Stay up {formatHours(gig.liveHoldHours)}</Row> : null}
                {sub.decidedAt ? <Row k="Decided">{formatDateTime(sub.decidedAt)}</Row> : null}
                {account ? <Row k="Account">{account.label}</Row> : null}
              </dl>
            </Section>
            <Section title="Activity">
              <SubmissionTimeline events={events} viewerRole="worker" newestFirst />
            </Section>
          </div>

          {canWithdraw(status) ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive">
                  <Undo2 /> Can't do it? Withdraw
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Withdraw from this gig?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your slot goes back to other workers and you can't take this gig again. You won't be paid for it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep it</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    disabled={withdraw.isPending}
                    onClick={(e) => {
                      e.preventDefault()
                      withdraw.mutate(undefined)
                    }}
                  >
                    {withdraw.isPending ? <Spinner /> : null}
                    Withdraw
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
