import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { CommandPalette } from '@/components/layout/command-palette'
import { ADMIN_NAV } from '@/components/layout/nav'
import { Kbd } from '@/components/ui/kbd'
import { adminBadgesQuery } from '@/features/analytics/queries'
import { homeFor } from '@/features/auth/guards'

export const Route = createFileRoute('/_app/admin')({
  beforeLoad: ({ context }) => {
    if (context.viewer.user.role !== 'admin') throw redirect({ to: homeFor(context.viewer) })
  },
  component: AdminLayout,
})

function AdminLayout() {
  const { viewer } = Route.useRouteContext()
  const { data: badges } = useQuery(adminBadgesQuery())
  return (
    <AppShell
      viewer={viewer}
      home="/admin"
      groups={ADMIN_NAV}
      badges={badges}
      headerExtra={
        <button
          type="button"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="hidden h-8 w-full max-w-xs items-center gap-2 rounded-md border bg-muted/40 px-2.5 text-sm text-muted-foreground hover:bg-muted md:flex"
        >
          <Search className="size-4" />
          Search workers, gigs…
          <Kbd className="ml-auto">⌘K</Kbd>
        </button>
      }
    >
      <CommandPalette />
      <Outlet />
    </AppShell>
  )
}
