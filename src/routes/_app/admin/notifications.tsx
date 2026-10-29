import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronDown, Mail, Pin, PinOff, Smartphone, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { RelativeTime } from '@/components/shared/relative-time'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { describeBroadcastAudience } from '@/features/broadcasts/audience'
import { BroadcastComposer } from '@/features/broadcasts/components/broadcast-composer'
import { broadcastsQuery } from '@/features/broadcasts/queries'
import { deleteBroadcast, setBroadcastPinned } from '@/features/broadcasts/server/broadcasts'
import { RichMessage } from '@/features/notifications/components/worker-notifications-list'
import { useAction } from '@/hooks/use-action'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/admin/notifications')({
  head: () => ({ meta: [{ title: 'Notify workers · TinyGig Admin' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(broadcastsQuery()),
  component: BroadcastsPage,
})

function BroadcastsPage() {
  const { data } = useSuspenseQuery(broadcastsQuery())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<{ id: string; subject: string } | null>(null)
  const pin = useAction((v: { id: string; pinned: boolean }) => setBroadcastPinned({ data: v }), {
    success: (_, v) => (v.pinned ? 'Pinned to the top of workers’ notifications' : 'Unpinned'),
    invalidate: [['admin', 'broadcasts']],
  })
  const remove = useAction((id: string) => deleteBroadcast({ data: { id } }), {
    success: 'Removed from workers’ notifications',
    invalidate: [['admin', 'broadcasts']],
    onSuccess: () => setDeleting(null),
  })

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        title="Notify workers"
        description="Announcements, new group links and policy changes. Reaches each worker’s notifications, and by email and push if you choose."
      />
      <BroadcastComposer />

      <section className="space-y-3">
        <h2 className="font-display text-base font-bold">Sent</h2>
        {data.length ? (
          <ul className="divide-y overflow-hidden rounded-lg border bg-card">
            {data.map((b) => {
              const open = expanded === b.id
              return (
                <li key={b.id} className={cn(b.pinnedAt && 'bg-primary/[0.03]')}>
                  <div className="flex flex-wrap items-start gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : b.id)}
                      aria-expanded={open}
                      className="min-w-0 flex-1 space-y-1 text-left"
                    >
                      <p className="flex items-center gap-2 font-medium">
                        {b.pinnedAt ? <Pin className="size-3.5 shrink-0 text-primary" aria-label="Pinned" /> : null}
                        <span className="truncate">{b.subject}</span>
                        <ChevronDown
                          className={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform duration-150',
                            open && 'rotate-180',
                          )}
                        />
                      </p>
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{describeBroadcastAudience(b.audience)}</span>
                        <span aria-hidden>·</span>
                        <RelativeTime date={b.createdAt} />
                        {b.channels.email ? (
                          <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[11px] font-normal">
                            <Mail className="size-3" /> Email
                          </Badge>
                        ) : null}
                        {b.channels.push ? (
                          <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[11px] font-normal">
                            <Smartphone className="size-3" /> Push
                          </Badge>
                        ) : null}
                      </p>
                    </button>
                    <p className="text-right text-xs text-muted-foreground tabular">
                      <span className="font-display text-sm font-bold text-foreground">{b.readCount}</span> of {b.recipientCount}{' '}
                      read
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pin.isPending}
                        onClick={() => pin.mutate({ id: b.id, pinned: !b.pinnedAt })}
                        aria-label={b.pinnedAt ? 'Unpin' : 'Pin to top'}
                      >
                        {b.pinnedAt ? <PinOff /> : <Pin />}
                        <span className="hidden sm:inline">{b.pinnedAt ? 'Unpin' : 'Pin'}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label="Delete"
                        onClick={() => setDeleting({ id: b.id, subject: b.subject })}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  {open ? (
                    <div className="border-t bg-background/60 px-4 py-3">
                      <RichMessage html={b.html} />
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            title="Nothing sent yet"
            description="Messages you send show up here with how many workers have read them."
          />
        )}
      </section>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.subject}”?</AlertDialogTitle>
            <AlertDialogDescription>
              It disappears from every worker’s notifications. Emails and pushes already delivered stay delivered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                if (deleting) remove.mutate(deleting.id)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
