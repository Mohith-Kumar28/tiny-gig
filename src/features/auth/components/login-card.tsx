import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { ArrowLeft, Mail } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'
import { GoogleIcon } from './google-icon'

type Step = { kind: 'email' } | { kind: 'code'; email: string }

export function LoginCard({ google, devEmails, redirectTo }: { google: boolean; devEmails: boolean; redirectTo?: string }) {
  const [step, setStep] = useState<Step>({ kind: 'email' })
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'send' | 'verify' | 'google' | null>(null)
  const router = useRouter()
  const qc = useQueryClient()

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const value = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(value)) return toast.error('Enter a valid email address')
    setBusy('send')
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: value, type: 'sign-in' })
    setBusy(null)
    if (error) return toast.error(error.message ?? 'Could not send code')
    setCode('')
    setStep({ kind: 'code', email: value })
    toast.success(devEmails ? 'Dev mode: the code is printed in the server console' : `We sent a code to ${value}`)
  }

  const verify = async (value: string) => {
    if (step.kind !== 'code' || value.length !== 6) return
    setBusy('verify')
    const { error } = await authClient.signIn.emailOtp({ email: step.email, otp: value })
    if (error) {
      setBusy(null)
      setCode('')
      return toast.error(error.message ?? 'Invalid code')
    }
    qc.clear()
    await router.invalidate()
    await router.navigate({ to: redirectTo ?? '/app' })
  }

  const withGoogle = async () => {
    setBusy('google')
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: redirectTo ?? '/app' })
    if (error) {
      setBusy(null)
      toast.error(error.message ?? 'Google sign-in failed')
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {step.kind === 'email' ? (
        <>
          <div className="space-y-1.5">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Sign in to TinyGig</h1>
            <p className="text-sm text-muted-foreground">New here? Signing in creates your account. Then you can apply.</p>
          </div>
          {google ? (
            <>
              <Button variant="outline" size="lg" className="w-full" onClick={withGoogle} disabled={busy !== null}>
                {busy === 'google' ? <Spinner /> : <GoogleIcon />}
                Continue with Google
              </Button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or use your email
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          ) : null}
          <form onSubmit={sendCode} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
              {busy === 'send' ? <Spinner /> : <Mail />}
              Email me a sign-in code
            </Button>
          </form>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setStep({ kind: 'email' })}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Use a different email
          </button>
          <div className="space-y-1.5">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code we sent to <span className="font-medium text-foreground">{step.email}</span>.
            </p>
          </div>
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(v) => {
              setCode(v)
              if (v.length === 6) void verify(v)
            }}
            autoFocus
            inputMode="numeric"
            pattern="^[0-9]+$"
            disabled={busy === 'verify'}
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} className="size-12 text-lg" />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <Button size="lg" className="w-full" onClick={() => verify(code)} disabled={code.length !== 6 || busy !== null}>
            {busy === 'verify' ? <Spinner /> : null}
            Verify and continue
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Didn't get it?{' '}
            <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => sendCode()} disabled={busy !== null}>
              Resend code
            </button>
          </p>
        </>
      )}
    </div>
  )
}
