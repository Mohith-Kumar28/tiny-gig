import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Bell, ChevronRight, CircleUserRound, Gift, LogOut, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTheme } from '@/components/shared/theme-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { notificationsQuery } from '@/features/notifications/queries'
import { authClient } from '@/lib/auth-client'
import { initials } from '@/lib/format'

/** Phone "Me" tab: everything that isn't a daily destination, one tap away. */
export const Route = createFileRoute('/_app/w/me')({
  head: () => ({ meta: [{ title: 'Me · TinyGig' }] }),
  component: MePage,
})

function Row({ to, search, icon, label, hint }: { to: string; search?: Record<string, string>; icon: ReactNode; label: string; hint?: ReactNode }) {
  return (
    <Link to={to} search={search} className="flex min-h-14 items-center gap-3 px-4 py-3 active:bg-accent">
      <span className="text-muted-foreground [&_svg]:size-5">{icon}</span>
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      {hint}
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  )
}

function MePage() {
  const { viewer } = Route.useRouteContext()
  const { data: notes } = useQuery(notificationsQuery())
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  const qc = useQueryClient()
  const signOut = async () => {
    await authClient.signOut()
    qc.clear()
    await router.navigate({ to: '/login' })
  }
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Link to="/w/profile" search={{ tab: 'account' }} className="flex items-center gap-4 rounded-2xl border bg-card p-4">
        <Avatar className="size-14">
          {viewer.user.image ? <AvatarImage src={viewer.user.image} alt="" /> : null}
          <AvatarFallback>{initials(viewer.user.name || viewer.user.email)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold">{viewer.user.name}</p>
          <p className="truncate text-sm text-muted-foreground">{viewer.user.email}</p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>

      <div className="divide-y overflow-hidden rounded-2xl border bg-card">
        <Row to="/w/referrals" icon={<Gift />} label="Invite & earn" />
        <Row
          to="/w/notifications"
          icon={<Bell />}
          label="Notifications"
          hint={
            notes?.unread ? (
              <span className="rounded-full bg-primary px-2 text-xs leading-5 font-semibold text-primary-foreground tabular">{notes.unread}</span>
            ) : null
          }
        />
      </div>

      <div className="divide-y overflow-hidden rounded-2xl border bg-card">
        <Row to="/w/profile" icon={<UserRound />} label="Work profile" />
        <Row to="/w/profile" search={{ tab: 'account' }} icon={<CircleUserRound />} label="Account" />
        <Row to="/w/profile" search={{ tab: 'security' }} icon={<ShieldCheck />} label="Password & security" />
      </div>

      <div className="divide-y overflow-hidden rounded-2xl border bg-card">
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left active:bg-accent"
        >
          <span className="text-muted-foreground [&_svg]:size-5">{resolvedTheme === 'dark' ? <Sun /> : <Moon />}</span>
          <span className="flex-1 text-[15px] font-medium">{resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <button type="button" onClick={signOut} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-destructive active:bg-accent">
          <LogOut className="size-5" />
          <span className="flex-1 text-[15px] font-medium">Sign out</span>
        </button>
      </div>
    </div>
  )
}
