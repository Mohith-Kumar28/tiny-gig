import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { RelativeTime } from '@/components/shared/relative-time'
import { cn } from '@/lib/utils'
import type { listNotifications } from '../server/notifications'

type Row = Awaited<ReturnType<typeof listNotifications>>['rows'][number]

export function WorkerNotificationsList({ rows, onOpen }: { rows: Row[]; onOpen?: (id: string) => void }) {
  if (!rows.length) {
    return (
      <EmptyState
        title="Nothing here yet"
        description="When you’re selected for a gig, a reviewer replies or a payout goes out, you’ll see it here. Turn on new-gig alerts on this device so you never miss one."
      />
    )
  }
  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card">
      {rows.map((n) => {
        const unread = !n.readAt
        const body = (
          <div className={cn('flex gap-3 px-4 py-3.5', unread && 'bg-ink/[0.04]')}>
            <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', unread ? 'bg-ink' : 'bg-transparent')} aria-hidden />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className={cn('text-sm leading-snug', unread ? 'font-semibold' : 'font-medium text-foreground/85')}>
                {n.title}
                {unread ? <span className="sr-only"> (unread)</span> : null}
              </p>
              {n.body ? <p className="text-sm text-muted-foreground">{n.body}</p> : null}
              <RelativeTime date={n.createdAt} className="text-xs text-muted-foreground" />
            </div>
            {n.href ? <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" /> : null}
          </div>
        )
        return (
          <li key={n.id}>
            {n.href ? (
              <Link
                to={n.href}
                onClick={() => unread && onOpen?.(n.id)}
                className="block transition-colors duration-150 hover:bg-accent/40 focus-visible:bg-accent/50 focus-visible:outline-none"
              >
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        )
      })}
    </ul>
  )
}
