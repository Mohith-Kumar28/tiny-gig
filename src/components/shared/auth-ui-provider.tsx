import { AuthUIProvider } from '@daveyplate/better-auth-ui'
import { useQueryClient } from '@tanstack/react-query'
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
