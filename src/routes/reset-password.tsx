import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/reset-password')({
  validateSearch: z.object({
    token: z.string().optional().catch(undefined),
    error: z.string().optional().catch(undefined),
  }),
  head: () => ({ meta: [{ title: 'Reset password · TinyGig' }, { name: 'robots', content: 'noindex' }] }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token, error } = Route.useSearch()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const invalid = !token || !!error

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    if (password !== confirm) return toast.error("Passwords don't match")
    setBusy(true)
    const { error: err } = await authClient.resetPassword({ newPassword: password, token: token! })
    setBusy(false)
    if (err) return toast.error(err.message ?? 'Could not reset password. The link may have expired.')
    toast.success('Password updated. Sign in with your new password.')
    await navigate({ to: '/login' })
  }

  return (
    <div className="flex min-h-dvh flex-col px-6 py-8">
      <Logo />
      <main className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <h1 className="font-display text-3xl font-semibold tracking-tight">{invalid ? 'Link expired' : 'Set a new password'}</h1>
            <p className="text-sm text-muted-foreground">
              {invalid
                ? 'This reset link is invalid or has expired. Request a new one from the sign-in page.'
                : 'Choose a password with at least 8 characters.'}
            </p>
          </div>
          {invalid ? (
            <Button asChild className="w-full" size="lg">
              <Link to="/login">Back to sign in</Link>
            </Button>
          ) : (
            <form onSubmit={submit} className="space-y-3" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoFocus
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
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? <Spinner /> : null}
                Update password
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
