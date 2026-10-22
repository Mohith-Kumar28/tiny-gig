import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Check, ChevronDown, Clock, FastForward, MessageSquarePlus, RotateCcw, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import { Countdown } from '@/components/shared/countdown'
import { Money } from '@/components/shared/money'
import { PlatformLabel } from '@/components/shared/platform-icon'
import { formatDateTime, RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { DecisionDialog } from '@/features/workers/components/decision-dialog'
import { useAction } from '@/hooks/use-action'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { accountLabel } from '@/features/accounts/rules'
import { OnBehalfActions } from './on-behalf-actions'
import { SubmissionClientSelect } from '@/features/clients/components/client-select'
import { cn } from '@/lib/utils'
import { submissionDetailQuery } from '../queries'
import { addSubmissionComment } from '../server/admin-review'
import { REVIEWABLE } from '../state'
import { ReviewProofCard } from './review-proof-card'
import { ReviewScreenshots } from './review-screenshots'
import { ReviewThread } from './review-thread'
import { ReviewWorkerCard } from './review-worker-card'
import { type DecisionVars, useReviewDecision } from './use-review-decision'

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-2.5', className)}>
      <h3 className="ledger-label">{title}</h3>
      {children}
    </section>
  )
}

/**
 * Everything a reviewer needs for one submission, plus the decision bar.
 * Keyboard: A approve · C request changes · R reject · O open proof.
 */
export function SubmissionReviewPanel({
  id,
  hotkeys = false,
  onDecided,
}: {
  id: string
  hotkeys?: boolean
  onDecided?: (vars: DecisionVars) => void
}) {
  const { data, isLoading } = useQuery(submissionDetailQuery(id))
  const [dialog, setDialog] = useState<'changes' | 'reject' | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [removed, setRemoved] = useState(false)
  const decide = useReviewDecision({
    onDone: (v) => {
      setDialog(null)
      setIssues([])
      onDecided?.(v)
    },
  })
  const comment = useAction((c: string) => addSubmissionComment({ data: { id, comment: c } }), {
    success: 'Comment sent to worker',
    invalidate: [['admin', 'submission', id]],
    onSuccess: () => setNote(''),
  })

  const sub = data?.submission
  const canDecide = !!sub && REVIEWABLE.includes(sub.status)
  const isLiveCheck = sub?.status === 'live_check'
  const onHold = sub?.status === 'on_hold'
  const twoStepReview = sub?.status === 'in_review'
  const holdOver = onHold && sub?.liveCheckAt ? new Date(sub.liveCheckAt) <= new Date() : false
  const liveDue = isLiveCheck && sub?.liveCheckAt ? new Date(sub.liveCheckAt) <= new Date() : false

  const approve = (skipLiveCheck = false) => {
    if (!canDecide || decide.isPending) return
    decide.mutate({ ids: [id], decision: 'approve', skipLiveCheck })
  }

  useHotkeys(
    {
      a: () => !onHold && approve(),
      c: () => canDecide && !isLiveCheck && setDialog('changes'),
      r: () => canDecide && setDialog('reject'),
      o: () => sub?.proofUrl && window.open(sub.proofUrl, '_blank', 'noopener'),
    },
    hotkeys && !!data,
  )

  if (isLoading || !data || !sub) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-16" />
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
      </div>
    )
  }
  const { gig, worker, events, workerHistory } = data

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-5">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={sub.status} />
            {sub.revision > 1 ? <span className="text-xs text-muted-foreground">Revision {sub.revision}</span> : null}
            <SubmissionClientSelect submissionId={sub.id} value={sub.clientTagId} />
            <span className="ml-auto">
              <Money paise={sub.payoutAmount} className="font-display text-xl font-bold" />
            </span>
          </div>
          <Link
            to="/admin/gigs/$gigId"
            params={{ gigId: gig.id }}
            className="block font-display text-xl leading-tight font-bold text-balance underline-offset-4 hover:underline"
          >
            {gig.title}
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <PlatformLabel platform={gig.platform} community={gig.community} />
            <span>·</span>
            <span className="capitalize">{gig.taskType}</span>
            {data.account ? (
              <>
                <span>·</span>
                <a
                  href={data.account.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground hover:underline"
                >
                  {accountLabel(data.account.platform, data.account.handle)}
                </a>
                {sub.level ? <span>{sub.level}</span> : null}
              </>
            ) : null}
            {sub.submittedAt ? (
              <>
                <span>·</span>
                <span>
                  Submitted <RelativeTime date={sub.submittedAt} />
                </span>
              </>
            ) : null}
          </div>
        </header>

        {isLiveCheck && sub.liveCheckAt ? (
          <div
            className={cn(
              'flex gap-3 rounded-lg border p-3.5 text-sm',
              liveDue ? 'border-ink/40 bg-ink/8' : 'border-border bg-muted/40',
            )}
          >
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ink" />
            <div className="space-y-1">
              <p className="font-medium">
                {liveDue ? 'Live check due: open the link and confirm it is still up' : 'Waiting for the live-hold period'}
              </p>
              <p className="text-muted-foreground">
                Must stay live {gig.liveHoldHours}h, until {formatDateTime(sub.liveCheckAt)}.{' '}
                {!liveDue ? <Countdown to={sub.liveCheckAt} prefix="Check" className="align-middle" /> : null}
              </p>
            </div>
          </div>
        ) : null}

        {onHold && sub.liveCheckAt ? (
          <div
            className={cn(
              'flex gap-3 rounded-lg border p-3.5 text-sm',
              holdOver ? 'border-warning/40 bg-warning/10' : 'border-border bg-muted/40',
            )}
          >
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-info" />
            <div className="space-y-1">
              <p className="font-medium">
                {holdOver ? 'Hold over: waiting for the insights screenshot' : 'On hold: the post must stay live'}
              </p>
              <p className="text-muted-foreground">
                Live until {formatDateTime(sub.liveCheckAt)}.{' '}
                {!holdOver ? (
                  <Countdown to={sub.liveCheckAt} prefix="Hold ends" className="align-middle" />
                ) : (
                  'The worker has been reminded.'
                )}
              </p>
            </div>
          </div>
        ) : null}

        <Section title="Proof">
          <ReviewProofCard url={sub.proofUrl} targetUrl={gig.targetUrl} />
          <ReviewScreenshots keys={sub.screenshotKeys} />
          {sub.insightsKeys.length ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Insights (uploaded {sub.insightsSubmittedAt ? formatDateTime(sub.insightsSubmittedAt) : ''}): check the post
                survived and the worker replied to comments
              </p>
              <ReviewScreenshots keys={sub.insightsKeys} />
            </div>
          ) : null}
          {sub.onBehalfBy ? (
            <p className="text-xs text-muted-foreground">
              Added by {data.onBehalfName ?? 'staff'} on behalf of{' '}
              {data.account ? accountLabel(data.account.platform, data.account.handle) : 'the worker'}.
            </p>
          ) : null}
          <OnBehalfActions
            submissionId={sub.id}
            workerId={sub.workerId}
            status={sub.status}
            accountLabel={data.account ? accountLabel(data.account.platform, data.account.handle) : undefined}
          />
          {sub.workerNote ? (
            <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm whitespace-pre-wrap">
              <span className="text-muted-foreground">Worker note: </span>
              {sub.workerNote}
            </p>
          ) : null}
        </Section>

        {gig.reviewChecklist.length ? (
          <Section title="Review checklist">
            <ol className="divide-y rounded-lg border bg-card text-sm">
              {gig.reviewChecklist.map((item, i) => (
                <li key={item} className="flex items-baseline gap-3 px-3.5 py-2">
                  <span className="w-4 shrink-0 text-right text-xs text-muted-foreground tabular">{i + 1}</span>
                  {item}
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        <Section title="Worker">
          <ReviewWorkerCard worker={worker} history={workerHistory} />
        </Section>

        <details className="group rounded-lg border">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-sm font-medium">
            Gig brief
            <ChevronDown className="size-4 transition group-open:rotate-180" />
          </summary>
          <div className="space-y-3 border-t px-3.5 py-3 text-sm">
            <p className="whitespace-pre-wrap">{gig.brief}</p>
            {gig.contentGuidelines ? <p className="whitespace-pre-wrap text-muted-foreground">{gig.contentGuidelines}</p> : null}
          </div>
        </details>

        <Section title="Activity">
          <ReviewThread events={events} />
          <div className="flex items-end gap-2">
            <Label htmlFor={`note-${id}`} className="sr-only">
              Message the worker
            </Label>
            <Textarea
              id={`note-${id}`}
              rows={1}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && note.trim()) comment.mutate(note.trim())
              }}
              placeholder="Message the worker without changing status…"
              className="field-sizing-content max-h-40 min-h-9 resize-none text-sm"
            />
            <Button
              size="icon"
              variant="outline"
              className="shrink-0"
              disabled={!note.trim() || comment.isPending}
              onClick={() => comment.mutate(note.trim())}
              aria-label="Send comment"
              title="Send comment (⌘↵)"
            >
              <MessageSquarePlus />
            </Button>
          </div>
        </Section>
      </div>

      {canDecide ? (
        <footer className="flex flex-wrap items-center gap-1.5 border-t bg-card px-3 py-2.5 lg:flex-nowrap xl:gap-2">
          <Button
            variant="outline"
            onClick={() => setDialog('reject')}
            disabled={decide.isPending}
            className="flex-1 hover:border-destructive/40 hover:text-destructive sm:flex-none lg:has-[>svg]:px-2 xl:has-[>svg]:px-3"
          >
            <X /> {isLiveCheck || onHold ? 'Removed: reject' : 'Reject'} <Kbd className="ml-1 hidden xl:inline-flex">R</Kbd>
          </Button>
          {!isLiveCheck ? (
            <Button
              variant="outline"
              onClick={() => setDialog('changes')}
              disabled={decide.isPending}
              className="flex-1 sm:flex-none lg:has-[>svg]:px-2 xl:has-[>svg]:px-3"
            >
              <RotateCcw /> Changes <Kbd className="ml-1 hidden xl:inline-flex">C</Kbd>
            </Button>
          ) : null}
          <ButtonGroup className="ml-auto w-full sm:w-auto">
            <Button onClick={() => approve()} disabled={decide.isPending || onHold} className="flex-1 sm:flex-none">
              <Check />
              {onHold
                ? 'Waiting for insights'
                : twoStepReview
                  ? 'Approve & credit balance'
                  : isLiveCheck
                    ? 'Still live: approve'
                    : gig.liveHoldHours > 0
                      ? 'Approve, start live check'
                      : 'Approve'}
              <Kbd className="ml-1 hidden bg-primary-foreground/20 text-primary-foreground xl:inline-flex">A</Kbd>
            </Button>
            {!isLiveCheck && !onHold && !twoStepReview && gig.liveHoldHours > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" disabled={decide.isPending} aria-label="More approve options">
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => approve(true)}>
                    <FastForward /> Approve & skip live check
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </ButtonGroup>
        </footer>
      ) : (
        <footer className="flex items-center gap-2 border-t bg-card p-3 text-sm text-muted-foreground">
          <Clock className="size-4" />
          {sub.status === 'claimed'
            ? 'Waiting for the worker to submit.'
            : sub.status === 'changes_requested'
              ? 'Waiting for the worker to resubmit.'
              : sub.decidedAt
                ? `Closed ${formatDateTime(sub.decidedAt)}`
                : 'No action needed.'}
        </footer>
      )}

      <DecisionDialog
        open={dialog === 'changes'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Request changes"
        description="The worker gets an email and a fresh deadline to fix and resubmit."
        confirmLabel="Send to worker"
        templateKind="changes"
        pending={decide.isPending}
        extra={
          gig.reviewChecklist.length ? (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">What's wrong? (optional)</p>
              {gig.reviewChecklist.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={issues.includes(item)}
                    onCheckedChange={(v) => setIssues((cur) => (v ? [...cur, item] : cur.filter((i) => i !== item)))}
                  />
                  {item}
                </label>
              ))}
            </div>
          ) : null
        }
        onConfirm={(c) => decide.mutate({ ids: [id], decision: 'request_changes', comment: c, checklist: issues })}
      />
      <DecisionDialog
        open={dialog === 'reject'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={isLiveCheck || onHold ? 'Reject: post was removed?' : 'Reject submission'}
        description="This is final. The slot is released and the worker is told why."
        confirmLabel="Reject"
        templateKind="reject"
        destructive
        pending={decide.isPending}
        extra={
          data.account ? (
            <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
              <Checkbox
                id={`removed-${id}`}
                checked={removed}
                onCheckedChange={(v) => setRemoved(v === true)}
                className="mt-0.5"
              />
              <label htmlFor={`removed-${id}`}>
                The post was removed (by the worker, a moderator or Reddit).{' '}
                <span className="text-muted-foreground">
                  Marks {accountLabel(data.account.platform, data.account.handle)} as warned.
                </span>
              </label>
            </div>
          ) : null
        }
        onConfirm={(c) => decide.mutate({ ids: [id], decision: 'reject', comment: c, markRemoved: removed })}
      />
    </div>
  )
}
