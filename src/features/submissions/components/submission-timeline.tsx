import type { LucideIcon } from 'lucide-react'
import { CheckCircle2, CircleSlash, Clock, Hand, MessageSquare, RotateCcw, Send, ShieldCheck, Undo2, XCircle } from 'lucide-react'
import { RelativeTime } from '@/components/shared/relative-time'
import { cn } from '@/lib/utils'

export type TimelineEvent = {
  id: string
  action: string
  actorRole: 'admin' | 'worker' | 'system'
  actorName: string | null
  comment: string | null
  checklist: string[] | null
  createdAt: Date | string
}

const ACTIONS: Record<string, { verb: string; icon: LucideIcon; tone: string }> = {
  claimed: { verb: 'got the gig', icon: Hand, tone: 'text-ink' },
  submitted: { verb: 'submitted the link', icon: Send, tone: 'text-foreground' },
  resubmitted: { verb: 'resubmitted proof', icon: RotateCcw, tone: 'text-foreground' },
  changes_requested: {
    verb: 'requested changes',
    icon: MessageSquare,
    tone: 'text-warning-foreground dark:text-warning',
  },
  moved_to_live_check: { verb: 'passed review, live check started', icon: ShieldCheck, tone: 'text-ink' },
  insights_submitted: { verb: 'uploaded the insights screenshot', icon: ShieldCheck, tone: 'text-foreground' },
  approved: { verb: 'approved the work', icon: CheckCircle2, tone: 'text-success' },
  rejected: { verb: 'did not approve the work', icon: XCircle, tone: 'text-destructive' },
  expired: { verb: 'the deadline passed', icon: Clock, tone: 'text-muted-foreground' },
  withdrawn: { verb: 'withdrew from the gig', icon: Undo2, tone: 'text-muted-foreground' },
  comment: { verb: 'commented', icon: MessageSquare, tone: 'text-muted-foreground' },
}

function actorLabel(e: TimelineEvent, viewerRole?: 'worker' | 'admin') {
  if (e.actorRole === 'system') return 'TinyGig'
  if (viewerRole === e.actorRole && viewerRole === 'worker') return 'You'
  return e.actorName || (e.actorRole === 'admin' ? 'TinyGig reviewer' : 'Worker')
}

/** Activity thread for a submission. Shared by the worker task page and admin review. */
export function SubmissionTimeline({
  events,
  viewerRole,
  newestFirst = false,
  className,
}: {
  events: TimelineEvent[]
  viewerRole?: 'worker' | 'admin'
  newestFirst?: boolean
  className?: string
}) {
  const list = newestFirst ? [...events].reverse() : events
  if (!list.length) return <p className="text-sm text-muted-foreground">No activity yet.</p>
  return (
    <ol className={cn('divide-y', className)}>
      {list.map((e) => {
        const meta = ACTIONS[e.action] ?? {
          verb: e.action.replace(/_/g, ' '),
          icon: CircleSlash,
          tone: 'text-muted-foreground',
        }
        const Icon = meta.icon
        const actor = actorLabel(e, viewerRole)
        const verb =
          e.actorRole === 'system' && e.action === 'expired'
            ? 'The deadline passed without a submission'
            : e.action === 'claimed' && e.actorRole === 'admin'
              ? viewerRole === 'worker'
                ? 'You were selected'
                : `${actor} selected this account`
              : `${actor} ${meta.verb}`
        return (
          <li key={e.id} className="flex gap-2.5 py-2.5 first:pt-0 last:pb-0">
            <Icon className={cn('mt-0.5 size-3.5 shrink-0', meta.tone)} aria-hidden />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-medium">{verb}</p>
                <RelativeTime date={e.createdAt} className="text-xs text-muted-foreground tabular" />
              </div>
              {e.comment ? (
                <p
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                    e.actorRole === 'admin' ? 'border-ink/30 bg-ink/[0.04] text-foreground' : 'bg-muted/50 text-muted-foreground',
                  )}
                >
                  {e.comment}
                </p>
              ) : null}
              {e.checklist?.length ? (
                <ul className="space-y-1">
                  {e.checklist.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                      {c}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
