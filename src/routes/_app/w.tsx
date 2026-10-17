import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { BottomNav } from '@/components/layout/bottom-nav'
import { WORKER_BOTTOM_NAV, WORKER_NAV } from '@/components/layout/nav'
import { homeFor } from '@/features/auth/guards'
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
  return (
    <AppShell
      viewer={viewer}
      home="/w"
      groups={[{ items: WORKER_NAV }]}
      badges={{ active: counts?.active ?? 0 }}
      notificationsHref="/w/notifications"
      mobileNav={<BottomNav items={WORKER_BOTTOM_NAV} badges={{ active: counts?.active ?? 0 }} />}
    >
      <Outlet />
    </AppShell>
  )
}
