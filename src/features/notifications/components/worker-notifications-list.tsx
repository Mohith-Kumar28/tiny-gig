import { Link } from '@tanstack/react-router'
import { ChevronRight, Pin } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { RelativeTime } from '@/components/shared/relative-time'
import { cn } from '@/lib/utils'
import type { listNotifications } from '../server/notifications'

type Row = Awaited<ReturnType<typeof listNotifications>>['rows'][number]

/** Broadcast bodies are rendered on the server from an allow-listed document, so they're safe to inject. */
export function RichMessage({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none text-foreground/90 dark:prose-invert prose-headings:font-display prose-headings:text-foreground prose-a:text-primary prose-a:break-words prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5',
        className,
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: rendered by renderHtml from a validated doc
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function Item({ n, onOpen }: { n: Row; onOpen?: (id: string) => void }) {
  const unread = !n.readAt
  const pinned = Boolean(n.pinnedAt)
  const body = (
    <div className={cn('flex gap-3 px-4 py-3.5', unread && 'bg-ink/[0.04]')}>
      <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', unread ? 'bg-ink' : 'bg-transparent')} aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className={cn('text-sm leading-snug', unread ? 'font-semibold' : 'font-medium text-foreground/85')}>
          {n.title}
          {unread ? <span className="sr-only"> (unread)</span> : null}
        </p>
        {n.html ? <RichMessage html={n.html} /> : n.body ? <p className="text-sm text-muted-foreground">{n.body}</p> : null}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {pinned ? (
            <>
              <Pin className="size-3" /> Pinned ·
            </>
          ) : null}
          <RelativeTime date={n.createdAt} />
        </p>
      </div>
      {n.href && !n.html ? <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" /> : null}
    </div>
  )
  if (n.href && !n.html) {
    return (
      <Link
        to={n.href}
        onClick={() => unread && onOpen?.(n.id)}
        className="block transition-colors duration-150 hover:bg-accent/40 focus-visible:bg-accent/50 focus-visible:outline-none"
      >
        {body}
      </Link>
    )
  }
  // Messages from staff are read in place; a tap anywhere marks them read.
  return unread ? (
    <button type="button" className="block w-full text-left" onClick={() => onOpen?.(n.id)}>
      {body}
    </button>
  ) : (
    body
  )
}

export function WorkerNotificationsList({ rows, pinned = [], onOpen }: { rows: Row[]; pinned?: Row[]; onOpen?: (id: string) => void }) {
  if (!rows.length && !pinned.length) {
    return (
      <EmptyState
        title="Nothing here yet"
        description="When you’re selected for a gig, a reviewer replies or a payout goes out, you’ll see it here. Turn on new-gig alerts on this device so you never miss one."
      />
    )
  }
  return (
    <div className="space-y-5">
      {pinned.length ? (
        <ul aria-label="Pinned" className="divide-y overflow-hidden rounded-lg border border-primary/30 bg-card">
          {pinned.map((n) => (
            <li key={n.id}>
              <Item n={n} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      ) : null}
      {rows.length ? (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {rows.map((n) => (
            <li key={n.id}>
              <Item n={n} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
