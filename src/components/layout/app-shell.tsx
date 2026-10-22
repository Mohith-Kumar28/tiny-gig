import { Link, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { LogoMark, Wordmark } from '@/components/shared/logo'
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
import { isNavActive, type NavItem } from './nav'
import { NotificationBell } from './notification-bell'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'
import { cn } from '@/lib/utils'

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
                const active = isNavActive(item, pathname)
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
                      <SidebarMenuBadge className="rounded-[3px] bg-cloth-foreground/15 font-semibold text-sidebar-foreground tabular peer-data-[active=true]/menu-button:bg-cloth peer-data-[active=true]/menu-button:text-cloth-foreground">{badge}</SidebarMenuBadge>
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
  mobileNav,
  children,
}: {
  viewer: Viewer
  groups: NavGroup[]
  badges?: Record<string, number>
  home: string
  headerExtra?: ReactNode
  notificationsHref?: string
  /** Phone tab bar. When set, the sidebar is desktop-only and content clears the bar. */
  mobileNav?: ReactNode
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
                  <LogoMark inverse className="size-8!" />
                  <div className="grid flex-1 text-left leading-tight">
                    <Wordmark className="text-base" />
                    <span className="text-xs text-sidebar-foreground/65">{viewer.user.role === 'admin' ? 'Admin console' : 'Worker'}</span>
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
      <SidebarInset className="min-w-0">
        <header
          className={cn(
            'sticky top-0 z-30 flex h-13 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:px-6 lg:px-8',
            // On phones the worker app wears the red cloth band, like the cover of a khata.
            mobileNav &&
              'max-md:border-cloth max-md:bg-cloth max-md:text-cloth-foreground max-md:supports-[backdrop-filter]:bg-cloth max-md:[&_button]:text-cloth-foreground max-md:[&_button:hover]:bg-cloth-foreground/12',
          )}
        >
          <SidebarTrigger className={mobileNav ? '-ml-2 hidden md:inline-flex' : '-ml-2'} />
          {mobileNav ? (
            <Link to={home} className="flex items-center gap-2 md:hidden">
              <LogoMark inverse className="size-7" />
              <Wordmark />
            </Link>
          ) : null}
          <div className="flex min-w-0 flex-1 items-center gap-2">{headerExtra}</div>
          <ThemeToggle />
          <NotificationBell allHref={notificationsHref} />
        </header>
        <main
          className={
            mobileNav
              ? 'w-full min-w-0 flex-1 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] [--mobile-nav-offset:calc(4rem+env(safe-area-inset-bottom))] sm:px-6 md:py-6 md:[--mobile-nav-offset:0px] lg:px-8'
              : 'w-full min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8'
          }
        >
          {children}
        </main>
        {mobileNav}
      </SidebarInset>
    </SidebarProvider>
  )
}
