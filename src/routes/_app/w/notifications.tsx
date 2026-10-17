import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { CheckCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { WorkerNotificationsList } from '@/features/notifications/components/worker-notifications-list'
import { notificationsQuery } from '@/features/notifications/queries'
import { markNotificationsRead } from '@/features/notifications/server/notifications'
import { useAction } from '@/hooks/use-action'

const LIMIT = 200

export const Route = createFileRoute('/_app/w/notifications')({
  head: () => ({ meta: [{ title: 'Notifications · TinyGig' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(notificationsQuery(LIMIT)),
  component: NotificationsPage,
})

function NotificationsPage() {
  const { data } = useSuspenseQuery(notificationsQuery(LIMIT))
  const markAll = useAction(() => markNotificationsRead({ data: {} }), {
    success: 'All marked as read',
    invalidate: [['notifications']],
  })
  const markOne = useAction((id: string) => markNotificationsRead({ data: { ids: [id] } }), { invalidate: [['notifications']] })

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Notifications"
        description={data.unread ? `${data.unread} unread` : 'Everything is read.'}
        actions={
          <Button variant="outline" size="sm" disabled={!data.unread || markAll.isPending} onClick={() => markAll.mutate(undefined)}>
            {markAll.isPending ? <Spinner /> : <CheckCheck />} Mark all read
          </Button>
        }
      />
      <WorkerNotificationsList rows={data.rows} onOpen={(id) => markOne.mutate(id)} />
    </div>
  )
}
