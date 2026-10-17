import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Bell, CheckCheck } from 'lucide-react'
import { RelativeTime } from '@/components/shared/relative-time'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { notificationsQuery } from '@/features/notifications/queries'
import { markNotificationsRead } from '@/features/notifications/server/notifications'
import { useAction } from '@/hooks/use-action'
import { cn } from '@/lib/utils'

export function NotificationBell({ allHref }: { allHref?: string }) {
  const { data } = useQuery(notificationsQuery())
  const markAll = useAction(() => markNotificationsRead({ data: {} }), { invalidate: [['notifications']] })
  const unread = data?.unread ?? 0
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}>
          <Bell />
          {unread > 0 ? (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground tabular">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-1rem))] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={!unread || markAll.isPending} onClick={() => markAll.mutate(undefined)}>
            <CheckCheck /> Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-[420px]">
          {data?.rows.length ? (
            <ul className="divide-y">
              {data.rows.map((n) => {
                const content = (
                  <div className="flex gap-2.5 px-3 py-2.5">
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-primary')} />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm leading-snug font-medium">{n.title}</p>
                      {n.body ? <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p> : null}
                      <RelativeTime date={n.createdAt} className="text-[11px] text-muted-foreground" />
                    </div>
                  </div>
                )
                return (
                  <li key={n.id} className="hover:bg-accent/50">
                    {n.href ? <Link to={n.href}>{content}</Link> : content}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">You're all caught up.</p>
          )}
        </ScrollArea>
        {allHref ? (
          <div className="border-t p-1.5">
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to={allHref}>View all</Link>
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
