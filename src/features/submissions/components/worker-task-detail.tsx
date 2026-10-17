import { Link, useRouter } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Hourglass,
  type Info,
  ShieldCheck,
  Undo2,
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
import { useAction } from '@/hooks/use-action'
import { cn } from '@/lib/utils'
import { type getMySubmission, withdrawClaim } from '../server/worker-submissions'
import { canWithdraw } from '../state'
import { ProofForm } from './proof-form'
import { StatusStepper } from './status-stepper'
import { SubmissionTimeline } from './submission-timeline'

type TaskData = Awaited<ReturnType<typeof getMySubmission>>

function Card({
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
    <section className={cn('rounded-xl border bg-card p-4 sm:p-5', className)}>
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

function Callout({
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
        'rounded-xl border p-4 sm:p-5',
        tone === 'warning' && 'border-warning/50 bg-warning/10',
        tone === 'info' && 'border-info/30 bg-info/8',
        tone === 'success' && 'border-success/30 bg-success/8',
        tone === 'danger' && 'border-destructive/30 bg-destructive/6',
      )}
    >
      <div className="flex gap-3">
        <Icon
          className={cn(
            'mt-0.5 size-5 shrink-0',
            tone === 'warning' && 'text-warning-foreground dark:text-warning',
            tone === 'info' && 'text-info',
            tone === 'success' && 'text-success',
            tone === 'danger' && 'text-destructive',
          )}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="font-display text-base leading-snug font-semibold">{title}</h2>
          {children}
        </div>
      </div>
    </section>
  )
}

export function WorkerTaskDetail({ data }: { data: TaskData }) {
  const { submission: sub, gig, events } = data
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
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-balance sm:text-[1.65rem]">{gig.title}</h1>
          <Money
            paise={sub.payoutAmount}
            className={cn('font-display text-2xl font-semibold', status === 'approved' ? 'text-success' : 'text-primary')}
          />
        </div>
      </header>

      <Card>
        <StatusStepper status={status} liveHold={gig.liveHoldHours > 0} hasSubmitted={hasSubmitted} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0 space-y-4">
          {status === 'changes_requested' ? (
            <Callout tone="warning" icon={AlertTriangle} title="The reviewer asked for changes">
              {lastAdmin?.comment ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{lastAdmin.comment}</p> : null}
              {lastAdmin?.checklist?.length ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Please fix</p>
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
              <p className="text-sm text-muted-foreground">
                Fix your post, then resubmit below. <Countdown to={sub.dueAt} prefix="Due" />
              </p>
            </Callout>
          ) : null}

          {status === 'rejected' ? (
            <Callout tone="danger" icon={XCircle} title="This task was not approved">
              {lastAdmin?.comment ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{lastAdmin.comment}</p> : null}
              <p className="text-sm text-muted-foreground">No payment for this one. Check the reason and try another gig.</p>
            </Callout>
          ) : null}

          {status === 'live_check' ? (
            <Callout tone="info" icon={ShieldCheck} title="Passed review. Keep your post live.">
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
                <Countdown to={sub.liveCheckAt} prefix="Final check" className="text-sm text-info" />
              ) : sub.liveCheckAt ? (
                <p className="text-sm font-medium text-info">The hold time is over. We'll do the final check and approve soon.</p>
              ) : null}
            </Callout>
          ) : null}

          {status === 'submitted' || status === 'resubmitted' ? (
            <Callout tone="info" icon={Hourglass} title="Submitted. Waiting for review.">
              <p className="text-sm text-muted-foreground">
                Our team usually reviews within a day. You'll get an email and a notification when there's an update.
              </p>
            </Callout>
          ) : null}

          {status === 'approved' ? (
            <Callout
              tone="success"
              icon={CheckCircle2}
              title={
                <>
                  Approved! <Money paise={sub.payoutAmount} /> earned
                </>
              }
            >
              <p className="text-sm text-muted-foreground">
                {sub.payoutId
                  ? 'This was included in a payout.'
                  : 'It has been added to your balance and will be paid in the next UPI payout.'}{' '}
                <Link to="/w/payments" className="font-medium text-foreground underline underline-offset-2">
                  See payments
                </Link>
              </p>
            </Callout>
          ) : null}

          {status === 'expired' ? (
            <Callout tone="danger" icon={Clock} title="The deadline passed">
              <p className="text-sm text-muted-foreground">This claim expired because proof wasn't submitted in time.</p>
            </Callout>
          ) : null}

          {needsProof ? (
            <Card
              title={status === 'changes_requested' ? 'Resubmit your proof' : 'Submit your proof'}
              action={!overdue ? <Countdown to={sub.dueAt} prefix="Due" /> : null}
            >
              {overdue ? (
                <p className="rounded-lg bg-destructive/8 p-3 text-sm text-destructive">
                  The deadline for this task has passed, so it can't be submitted anymore.
                </p>
              ) : (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Finish by <strong className="text-foreground">{formatDateTime(sub.dueAt)}</strong>. Do the task first, then
                    paste the link here.
                  </p>
                  <ProofForm
                    key={`${sub.id}-${sub.revision}`}
                    submissionId={sub.id}
                    platform={gig.platform}
                    resubmit={status === 'changes_requested'}
                    defaults={{ proofUrl: sub.proofUrl, screenshotKeys: sub.screenshotKeys, workerNote: sub.workerNote }}
                  />
                </>
              )}
            </Card>
          ) : sub.proofUrl ? (
            <Card title="Your submission">
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-2.5 pl-3">
                  <a
                    href={sub.proofUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="min-w-0 flex-1 truncate text-sm font-medium underline-offset-2 hover:underline"
                  >
                    {sub.proofUrl}
                  </a>
                  <CopyButton value={sub.proofUrl} />
                  <Button asChild variant="ghost" size="icon" className="size-7">
                    <a href={sub.proofUrl} target="_blank" rel="noreferrer noopener" aria-label="Open link">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </div>
                {sub.screenshotKeys.length ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {sub.screenshotKeys.map((k, i) => (
                      <a
                        key={k}
                        href={`/api/uploads/${k}`}
                        target="_blank"
                        rel="noreferrer"
                        className="aspect-square overflow-hidden rounded-lg border bg-muted"
                      >
                        <img
                          src={`/api/uploads/${k}`}
                          alt={`Screenshot ${i + 1}`}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
                {sub.workerNote ? <p className="text-sm whitespace-pre-wrap text-muted-foreground">“{sub.workerNote}”</p> : null}
              </div>
            </Card>
          ) : null}

          <Collapsible open={briefOpen} onOpenChange={setBriefOpen} className="rounded-xl border bg-card">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-4 text-left sm:px-5">
              <span className="font-display text-base font-semibold">Gig brief</span>
              <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', briefOpen && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 border-t px-4 pt-4 pb-5 sm:px-5">
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
                  <h3 className="text-sm font-semibold">Content guidelines</h3>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{gig.contentGuidelines}</div>
                </div>
              ) : null}
              {gig.sampleContent ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Sample content</h3>
                    <CopyButton value={gig.sampleContent} label="Copy" size="sm" />
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3 font-mono text-[13px] whitespace-pre-wrap">{gig.sampleContent}</div>
                </div>
              ) : null}
              {gig.reviewChecklist.length ? (
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold">What the reviewer checks</h3>
                  <ul className="space-y-1.5">
                    {gig.reviewChecklist.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Link
                to="/w/gigs/$gigId"
                params={{ gigId: gig.id }}
                className="inline-block text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                View full gig page
              </Link>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-18">
          <Card title="Details">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Claimed</dt>
                <dd className="text-right">{formatDateTime(sub.claimedAt)}</dd>
              </div>
              {needsProof ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Deadline</dt>
                  <dd className="text-right">{formatDateTime(sub.dueAt)}</dd>
                </div>
              ) : null}
              {sub.submittedAt ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd className="text-right">{formatDateTime(sub.submittedAt)}</dd>
                </div>
              ) : null}
              {gig.liveHoldHours > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Live check</dt>
                  <dd className="text-right">Stay up {formatHours(gig.liveHoldHours)}</dd>
                </div>
              ) : null}
              {sub.decidedAt ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Decided</dt>
                  <dd className="text-right">{formatDateTime(sub.decidedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card title="Activity">
            <SubmissionTimeline events={events} viewerRole="worker" newestFirst />
          </Card>

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
                    Your slot goes back to other workers and you can't claim this gig again. You won't be paid for it.
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
