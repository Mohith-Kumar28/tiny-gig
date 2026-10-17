import { Link, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { LogoMark } from '@/components/shared/logo'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import type { Viewer } from '@/features/auth/server/viewer'
import type { NavItem } from './nav'
import { NotificationBell } from './notification-bell'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

type NavGroup = { label?: string; items: NavItem[] }

function NavLinks({ groups, badges }: { groups: NavGroup[]; badges?: Record<string, number> }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { setOpenMobile } = useSidebar()
  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label ?? 'main'}>
          {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)
                const badge = item.badgeKey ? badges?.[item.badgeKey] : undefined
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link to={item.to} onClick={() => setOpenMobile(false)}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {badge ? (
                      <SidebarMenuBadge className="rounded-full bg-primary/12 text-primary tabular">{badge}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}

export function AppShell({
  viewer,
  groups,
  badges,
  home,
  headerExtra,
  notificationsHref,
  children,
}: {
  viewer: Viewer
  groups: NavGroup[]
  badges?: Record<string, number>
  home: string
  headerExtra?: ReactNode
  notificationsHref?: string
  children: ReactNode
}) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to={home}>
                  <LogoMark className="size-8" />
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="font-display text-base font-semibold">TinyGig</span>
                    <span className="text-xs text-muted-foreground">{viewer.user.role === 'admin' ? 'Admin console' : 'Worker'}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavLinks groups={groups} badges={badges} />
        </SidebarContent>
        <SidebarFooter>
          <UserMenu viewer={viewer} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-13 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6 lg:px-8">
          <SidebarTrigger className="-ml-2" />
          <div className="flex min-w-0 flex-1 items-center gap-2">{headerExtra}</div>
          <ThemeToggle />
          <NotificationBell allHref={notificationsHref} />
        </header>
        <main className="w-full min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
