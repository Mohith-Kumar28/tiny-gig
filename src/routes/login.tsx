import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { Logo } from '@/components/shared/logo'
import { homeFor } from '@/features/auth/guards'
import { LoginCard } from '@/features/auth/components/login-card'
import { getAuthConfig } from '@/features/auth/server/auth-config'
import { getViewer } from '@/features/auth/server/viewer'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().startsWith('/').optional().catch(undefined) }),
  head: () => ({
    meta: [{ title: 'Sign in · TinyGig' }, { name: 'robots', content: 'noindex' }],
  }),
  beforeLoad: async ({ search }) => {
    const viewer = await getViewer()
    if (viewer) throw redirect({ to: search.redirect ?? homeFor(viewer) })
  },
  loader: () => getAuthConfig(),
  component: LoginPage,
})

function LoginPage() {
  const config = Route.useLoaderData()
  const { redirect: redirectTo } = Route.useSearch()
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-foreground p-10 text-background lg:flex lg:flex-col lg:justify-between dark:bg-card dark:text-foreground">
        <Logo className="text-background dark:text-foreground" />
        <div className="max-w-md space-y-5">
          <p className="font-display text-4xl leading-[1.05] font-semibold tracking-tight">
            Small tasks. <span className="text-primary">Real UPI payouts.</span>
          </p>
          <ul className="space-y-2.5 text-sm opacity-80">
            <li>• Get picked for Reddit, X, LinkedIn & Threads gigs</li>
            <li>• Submit a link, get reviewed by a real person</li>
            <li>• Approved earnings go straight to your UPI ID</li>
          </ul>
        </div>
        <p className="text-xs opacity-60">Applications are reviewed by hand, usually within 24–48 hours.</p>
      </aside>
      <main className="flex flex-col px-6 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <LoginCard google={config.google} devEmails={config.devEmails} redirectTo={redirectTo} />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to our <Link to="/terms" className="underline underline-offset-4">Terms</Link> and{' '}
          <Link to="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  )
}
