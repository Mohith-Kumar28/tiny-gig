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

const POINTS = [
  'Raise your hand for Reddit, X, LinkedIn and Threads gigs',
  'Submit a link, get reviewed by a real person',
  'Approved earnings go straight to your UPI ID',
]

function LoginPage() {
  const config = Route.useLoaderData()
  const { redirect: redirectTo } = Route.useSearch()
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
      {/* Desktop: the red cloth cover of the khata. */}
      <aside className="relative hidden flex-col justify-between bg-cloth p-10 text-cloth-foreground lg:flex">
        <Logo inverse />
        <div className="max-w-md space-y-6">
          <p className="font-display text-[2.6rem] leading-[1.05] font-extrabold">Small tasks. Real UPI payouts.</p>
          <ol className="border-t border-cloth-foreground/20 text-sm">
            {POINTS.map((p, i) => (
              <li key={p} className="grid grid-cols-[2rem_1fr] border-b border-cloth-foreground/20 py-3">
                <span className="font-display font-extrabold tabular">{i + 1}</span>
                <span className="text-cloth-foreground/85">{p}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-cloth-foreground/65">Applications are reviewed by hand, usually within 24 to 48 hours.</p>
      </aside>

      <div className="flex min-h-dvh flex-col">
        {/* Phone: the cloth band, as on the public site. */}
        <header className="bg-cloth px-5 pt-3.5 pb-5 text-cloth-foreground lg:hidden">
          <Logo inverse />
          <p className="mt-4 font-display text-[1.35rem] leading-tight font-extrabold">Small tasks. Real UPI payouts.</p>
        </header>
        <main className="ledger-paper flex flex-1 flex-col px-4 py-8 [--line:2.25rem] [--margin:0.85rem] sm:px-10 sm:[--margin:1.6rem]">
          <div className="flex flex-1 items-start justify-center sm:items-center">
            <div className="w-full max-w-sm rounded-lg border bg-card p-5 sm:p-6">
              <LoginCard google={config.google} devEmails={config.devEmails} redirectTo={redirectTo} />
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing you agree to our{' '}
            <Link to="/terms" className="underline underline-offset-4 hover:text-ink">
              Terms
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="underline underline-offset-4 hover:text-ink">
              Privacy Policy
            </Link>
            .
          </p>
        </main>
      </div>
    </div>
  )
}
