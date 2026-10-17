import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { LogOut, UserRound } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import type { Viewer } from '@/features/auth/server/viewer'
import { authClient } from '@/lib/auth-client'
import { initials } from '@/lib/format'

export function UserMenu({ viewer }: { viewer: Viewer }) {
  const router = useRouter()
  const qc = useQueryClient()
  const signOut = async () => {
    await authClient.signOut()
    qc.clear()
    await router.navigate({ to: '/login' })
  }
  const isWorker = viewer.user.role === 'worker'
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-8 rounded-lg">
                {viewer.user.image ? <AvatarImage src={viewer.user.image} alt="" /> : null}
                <AvatarFallback className="rounded-lg text-xs">{initials(viewer.user.name || viewer.user.email)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{viewer.user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{viewer.user.email}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Signed in as {viewer.user.role === 'admin' ? 'admin' : 'worker'}
            </DropdownMenuLabel>
            {isWorker ? (
              <DropdownMenuItem asChild>
                <Link to="/w/profile">
                  <UserRound /> Profile
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
