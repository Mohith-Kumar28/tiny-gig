import { AuthUIContext } from '@daveyplate/better-auth-ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Mail } from 'lucide-react'
import { useContext, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  )
}

/**
 * Every way this person can sign in, in one ruled list. Replaces Better Auth UI's providers card,
 * which listed Google twice (once linked, once "Link") and errored on account info.
 */
export function SignInMethods({ email }: { email: string }) {
  const { social } = useContext(AuthUIContext)
  const googleOn = Boolean(social?.providers?.includes('google'))
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const { data: accounts, isPending } = useQuery({
    queryKey: ['auth', 'accounts'],
    queryFn: async () => (await authClient.listAccounts()).data ?? [],
  })
  const google = accounts?.find((a) => a.providerId === 'google')
  const hasPassword = Boolean(accounts?.some((a) => a.providerId === 'credential'))

  const connectGoogle = async () => {
    setBusy(true)
    const { error } = await authClient.linkSocial({ provider: 'google', callbackURL: window.location.pathname + window.location.search })
    if (error) {
      toast.error(error.message ?? 'Could not connect Google')
      setBusy(false)
    }
  }
  const disconnectGoogle = async () => {
    if (!google) return
    setBusy(true)
    const { error } = await authClient.unlinkAccount({ accountId: google.id })
    setBusy(false)
    if (error) return toast.error(error.message ?? 'Could not disconnect Google')
    toast.success('Google disconnected. You can still sign in with an email code.')
    await qc.invalidateQueries({ queryKey: ['auth', 'accounts'] })
  }

  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card">
      <li className="flex items-center gap-3 px-4 py-3.5">
        <Mail className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Email code</p>
          <p className="truncate text-xs text-muted-foreground">A 6-digit code to {email}. Always on.</p>
        </div>
      </li>
      {googleOn ? (
        <li className="flex items-center gap-3 px-4 py-3.5">
          <GoogleMark className="size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Google</p>
            <p className="text-xs text-muted-foreground">
              {isPending ? 'Checking…' : google ? 'Connected. One tap to sign in.' : 'Not connected.'}
            </p>
          </div>
          {isPending ? null : google ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={disconnectGoogle}>
              Disconnect
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled={busy} onClick={connectGoogle}>
              Connect
            </Button>
          )}
        </li>
      ) : null}
      <li className="flex items-center gap-3 px-4 py-3.5">
        <KeyRound className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Password</p>
          <p className="text-xs text-muted-foreground">
            {isPending ? 'Checking…' : hasPassword ? 'Set. Change it below.' : 'Not set. Optional, and needed for two-step sign-in.'}
          </p>
        </div>
      </li>
    </ul>
  )
}
