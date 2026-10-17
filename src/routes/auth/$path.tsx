import { AuthView } from '@daveyplate/better-auth-ui'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Logo } from '@/components/shared/logo'

/**
 * Better Auth UI views we don't build ourselves: sign-out and the two-factor
 * code step after a password sign-in. Sign-in itself lives at /login.
 */
export const Route = createFileRoute('/auth/$path')({
  head: () => ({ meta: [{ title: 'TinyGig' }, { name: 'robots', content: 'noindex' }] }),
  beforeLoad: ({ params }) => {
    if (params.path === 'sign-in' || params.path === 'sign-up') throw redirect({ to: '/login' })
    if (!['sign-out', 'two-factor', 'callback'].includes(params.path)) throw redirect({ to: '/login' })
  },
  component: AuthPage,
})

function AuthPage() {
  const { path } = Route.useParams()
  return (
    <div className="flex min-h-dvh flex-col px-6 py-8">
      <Logo />
      <main className="flex flex-1 items-center justify-center py-10">
        <AuthView pathname={`/auth/${path}`} redirectTo="/app" classNames={{ base: 'w-full max-w-sm' }} />
      </main>
    </div>
  )
}
