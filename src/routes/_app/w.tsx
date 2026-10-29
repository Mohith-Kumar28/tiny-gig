import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { BottomNav } from '@/components/layout/bottom-nav'
import { WORKER_BOTTOM_NAV, WORKER_NAV } from '@/components/layout/nav'
import { homeFor } from '@/features/auth/guards'
import { DisclaimerGate } from '@/features/consent/components/disclaimer-gate'
import { NewNotificationToasts } from '@/features/notifications/components/new-notification-toasts'
import { notificationsQuery } from '@/features/notifications/queries'
import { myWorkCountsQuery } from '@/features/submissions/queries'

export const Route = createFileRoute('/_app/w')({
  beforeLoad: ({ context }) => {
    const { viewer } = context
    if (viewer.user.role === 'worker' && viewer.profileStatus !== 'approved') throw redirect({ to: homeFor(viewer) })
    if (viewer.user.role === 'admin') throw redirect({ to: '/admin' })
  },
  component: WorkerLayout,
})

function WorkerLayout() {
  const { viewer } = Route.useRouteContext()
  const { data: counts } = useQuery(myWorkCountsQuery())
  const { data: notes } = useQuery(notificationsQuery())
  const badges = { active: counts?.active ?? 0, unread: notes?.unread ?? 0 }
  return (
    <AppShell
      viewer={viewer}
      home="/w"
      groups={[{ items: WORKER_NAV }]}
      badges={badges}
      mobileNav={<BottomNav items={WORKER_BOTTOM_NAV} badges={badges} />}
    >
      <Outlet />
      <DisclaimerGate />
      <NewNotificationToasts />
    </AppShell>
  )
}
