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
  claimed: { verb: 'claimed the gig', icon: Hand, tone: 'bg-info/12 text-info' },
  submitted: { verb: 'submitted proof', icon: Send, tone: 'bg-primary/12 text-primary' },
  resubmitted: { verb: 'resubmitted proof', icon: RotateCcw, tone: 'bg-primary/12 text-primary' },
  changes_requested: {
    verb: 'requested changes',
    icon: MessageSquare,
    tone: 'bg-warning/20 text-warning-foreground dark:text-warning',
  },
  moved_to_live_check: { verb: 'passed review, live check started', icon: ShieldCheck, tone: 'bg-info/12 text-info' },
  approved: { verb: 'approved the work', icon: CheckCircle2, tone: 'bg-success/12 text-success' },
  rejected: { verb: 'did not approve the work', icon: XCircle, tone: 'bg-destructive/10 text-destructive' },
  expired: { verb: 'the deadline passed, claim expired', icon: Clock, tone: 'bg-muted text-muted-foreground' },
  withdrawn: { verb: 'withdrew from the gig', icon: Undo2, tone: 'bg-muted text-muted-foreground' },
  comment: { verb: 'commented', icon: MessageSquare, tone: 'bg-muted text-muted-foreground' },
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
    <ol className={cn('relative space-y-5', className)}>
      <span aria-hidden className="absolute top-2 bottom-2 left-3.5 w-px bg-border" />
      {list.map((e) => {
        const meta = ACTIONS[e.action] ?? {
          verb: e.action.replace(/_/g, ' '),
          icon: CircleSlash,
          tone: 'bg-muted text-muted-foreground',
        }
        const Icon = meta.icon
        const actor = actorLabel(e, viewerRole)
        const verb =
          e.actorRole === 'system' && e.action === 'expired'
            ? 'The deadline passed and the claim expired'
            : `${actor} ${meta.verb}`
        return (
          <li key={e.id} className="relative flex gap-3">
            <span
              className={cn(
                'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-card',
                meta.tone,
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm">
                  <span className="font-medium">{verb}</span>
                </p>
                <RelativeTime date={e.createdAt} className="text-xs text-muted-foreground" />
              </div>
              {e.comment ? (
                <div
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                    e.actorRole === 'admin' ? 'bg-muted/50' : 'bg-background',
                  )}
                >
                  {e.comment}
                </div>
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
