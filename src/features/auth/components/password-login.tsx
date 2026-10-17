import { Eye, EyeOff, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'
import { useFinishSignIn } from './use-finish-sign-in'

type Mode = 'sign-in' | 'sign-up' | 'forgot'

const EMAIL_RE = /^\S+@\S+\.\S+$/

/** Email + password: sign in, create an account (email verified by link), or reset the password. */
export function PasswordLogin({ redirectTo }: { redirectTo?: string }) {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<{ email: string; kind: 'verify' | 'reset' } | null>(null)
  const finish = useFinishSignIn(redirectTo)
  const callbackURL = redirectTo ?? '/app'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!EMAIL_RE.test(value)) return toast.error('Enter a valid email address')
    if (mode !== 'forgot' && password.length < 8) return toast.error('Password must be at least 8 characters')
    setBusy(true)
    try {
      if (mode === 'forgot') {
        const { error } = await authClient.requestPasswordReset({ email: value, redirectTo: '/reset-password' })
        if (error) return toast.error(error.message ?? 'Could not send reset email')
        setSentTo({ email: value, kind: 'reset' })
        return
      }
      if (mode === 'sign-up') {
        const { error } = await authClient.signUp.email({
          email: value,
          password,
          name: value.split('@')[0] ?? 'TinyGig user',
          callbackURL,
        })
        if (error) {
          return toast.error(
            error.code === 'USER_ALREADY_EXISTS' || error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
              ? 'An account with this email already exists. Sign in, or use "Forgot password" to set one.'
              : (error.message ?? 'Could not create account'),
          )
        }
        setSentTo({ email: value, kind: 'verify' })
        return
      }
      const { data, error } = await authClient.signIn.email({ email: value, password, callbackURL })
      if (error) {
        if (error.code === 'EMAIL_NOT_VERIFIED') {
          setSentTo({ email: value, kind: 'verify' })
          return toast.message('Please confirm your email first. We sent you a new link.')
        }
        return toast.error(
          error.code === 'INVALID_EMAIL_OR_PASSWORD'
            ? 'Wrong email or password. Signed up with a code or Google? Use "Forgot password" to set one.'
            : (error.message ?? 'Could not sign in'),
        )
      }
      // Accounts with 2FA continue on /auth/two-factor (the client plugin redirects there).
      if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect) return
      await finish()
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-4 rounded-xl border bg-card p-5 text-center">
        <MailCheck className="mx-auto size-8 text-primary" />
        <div className="space-y-1">
          <p className="font-medium">Check your inbox</p>
          <p className="text-sm text-muted-foreground">
            {sentTo.kind === 'verify'
              ? `We sent a confirmation link to ${sentTo.email}. Click it to finish signing in.`
              : `If an account exists for ${sentTo.email}, we sent a link to reset the password.`}
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setSentTo(null)
            setMode('sign-in')
          }}
        >
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="pw-email">Email</Label>
        <Input
          id="pw-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11"
        />
      </div>
      {mode !== 'forgot' ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="pw-password">Password</Label>
            {mode === 'sign-in' ? (
              <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => setMode('forgot')}>
                Forgot password?
              </button>
            ) : null}
          </div>
          <div className="relative">
            <Input
              id="pw-password"
              type={show ? 'text' : 'password'}
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              placeholder={mode === 'sign-up' ? 'At least 8 characters' : ''}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">We'll email you a link to set a new password.</p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? <Spinner /> : null}
        {mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : 'Send reset link'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === 'sign-in' ? (
          <>
            New to TinyGig?{' '}
            <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => setMode('sign-up')}>
              Create an account
            </button>
          </>
        ) : (
          <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => setMode('sign-in')}>
            Back to sign in
          </button>
        )}
      </p>
    </form>
  )
}
