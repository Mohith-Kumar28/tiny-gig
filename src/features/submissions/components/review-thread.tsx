import { CheckCircle2, Clock, MessageSquare, RotateCcw, Send, ShieldCheck, Undo2, XCircle } from 'lucide-react'
import { RelativeTime } from '@/components/shared/relative-time'
import type { SubmissionAction } from '@/db/schema/enums'
import { cn } from '@/lib/utils'

type Event = {
  id: string
  action: SubmissionAction
  actorRole: 'admin' | 'worker' | 'system'
  actorName: string | null
  comment: string | null
  checklist: string[] | null
  createdAt: Date
}

const META: Record<SubmissionAction, { label: string; icon: typeof Clock; tone: string }> = {
  claimed: { label: 'assigned the gig', icon: Clock, tone: 'text-muted-foreground' },
  submitted: { label: 'submitted the link', icon: Send, tone: 'text-ink' },
  resubmitted: { label: 'resubmitted', icon: RotateCcw, tone: 'text-ink' },
  changes_requested: { label: 'requested changes', icon: RotateCcw, tone: 'text-warning-foreground dark:text-warning' },
  moved_to_live_check: { label: 'passed review: live check started', icon: ShieldCheck, tone: 'text-ink' },
  insights_submitted: { label: 'uploaded insights', icon: ShieldCheck, tone: 'text-ink' },
  approved: { label: 'approved', icon: CheckCircle2, tone: 'text-success' },
  rejected: { label: 'rejected', icon: XCircle, tone: 'text-destructive' },
  expired: { label: 'deadline passed', icon: Clock, tone: 'text-muted-foreground' },
  withdrawn: { label: 'withdrew', icon: Undo2, tone: 'text-muted-foreground' },
  comment: { label: 'commented', icon: MessageSquare, tone: 'text-muted-foreground' },
}

export function ReviewThread({ events }: { events: Event[] }) {
  return (
    <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-border">
      {events.map((e) => {
        const m = META[e.action]
        const who = e.actorRole === 'system' ? 'System' : (e.actorName ?? (e.actorRole === 'admin' ? 'Reviewer' : 'Worker'))
        return (
          <li key={e.id} className="relative flex gap-3">
            <span
              className={cn(
                'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background',
                m.tone,
              )}
            >
              <m.icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm">
                <span className="font-medium">{who}</span> <span className="text-muted-foreground">{m.label}</span>
                <span className="text-muted-foreground"> · </span>
                <RelativeTime date={e.createdAt} className="text-xs text-muted-foreground" />
              </p>
              {e.checklist?.length ? (
                <ul className="mt-1.5 flex flex-wrap gap-1">
                  {e.checklist.map((c) => (
                    <li key={c} className="rounded-md bg-warning/15 px-1.5 py-0.5 text-xs">
                      ✕ {c}
                    </li>
                  ))}
                </ul>
              ) : null}
              {e.comment ? (
                <p className="mt-1.5 rounded-lg bg-muted/60 px-3 py-2 text-sm whitespace-pre-wrap">{e.comment}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
