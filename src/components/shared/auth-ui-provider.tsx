import { AuthUIProvider } from '@daveyplate/better-auth-ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { authClient } from '@/lib/auth-client'

function RouterLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  )
}

/**
 * Better Auth UI 3.4 asks /account-info with the provider's account id, but Better Auth 1.7 matches its
 * own row id, so it always answered "Account not found". Translate the id first and fail quietly.
 */
function useAccountInfo(params: { query?: { accountId?: string } } | undefined) {
  const providerAccountId = params?.query?.accountId
  const { data, isPending, isRefetching, refetch } = useQuery({
    queryKey: ['auth', 'account-info', providerAccountId],
    enabled: Boolean(providerAccountId),
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const { data: accounts } = await authClient.listAccounts()
      const row = accounts?.find((a) => a.accountId === providerAccountId || a.id === providerAccountId)
      if (!row) return null
      const { data: info } = await authClient.accountInfo({ query: { accountId: row.id } })
      return info ?? null
    },
  })
  return { data: data as { user: { email?: string | null } } | null | undefined, isPending, isRefetching, error: null, refetch }
}

async function uploadAvatar(file: File) {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/avatars/', { method: 'POST', body })
  const json = (await res.json()) as { url?: string; error?: string }
  if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload failed')
  return json.url
}

async function deleteAvatar(url: string) {
  if (url.startsWith('/api/avatars/')) await fetch(url, { method: 'DELETE' })
}

/** Wires Better Auth UI (account settings, user button) to our router, client and storage. */
export function AuthUiProvider({ children, google }: { children: ReactNode; google: boolean }) {
  const router = useRouter()
  const qc = useQueryClient()
  return (
    <AuthUIProvider
      authClient={authClient}
      hooks={{ useAccountInfo: useAccountInfo as never }}
      navigate={(href) => router.navigate({ to: href })}
      replace={(href) => router.navigate({ to: href, replace: true })}
      onSessionChange={async () => {
        await qc.invalidateQueries({ queryKey: ['viewer'] })
        await router.invalidate()
      }}
      Link={RouterLink}
      redirectTo="/app"
      avatar={{ upload: uploadAvatar, delete: deleteAvatar, size: 256, extension: 'webp' }}
      account={{ basePath: '/account', fields: ['image', 'name'] }}
      credentials={{ forgotPassword: true }}
      changeEmail
      emailVerification
      twoFactor={['totp']}
      social={google ? { providers: ['google'] } : undefined}
      viewPaths={{ SIGN_IN: 'sign-in', SIGN_OUT: 'sign-out' }}
    >
      {children}
    </AuthUIProvider>
  )
}
