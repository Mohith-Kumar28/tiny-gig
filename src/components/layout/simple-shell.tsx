import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { ThemeToggle } from './theme-toggle'

/** Minimal chrome for onboarding / pending screens. */
export function SimpleShell({ email, children }: { email: string; children: ReactNode }) {
  const router = useRouter()
  const qc = useQueryClient()
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-1">
          <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await authClient.signOut()
              qc.clear()
              await router.navigate({ to: '/login' })
            }}
          >
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-16">{children}</main>
    </div>
  )
}
