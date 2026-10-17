import { ArrowLeft, Mail } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'
import { useFinishSignIn } from './use-finish-sign-in'

type Step = { kind: 'email' } | { kind: 'code'; email: string }

/** Passwordless sign-in: email → 6-digit code. Also creates the account on first use. */
export function OtpLogin({ devEmails, redirectTo }: { devEmails: boolean; redirectTo?: string }) {
  const [step, setStep] = useState<Step>({ kind: 'email' })
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null)
  const finish = useFinishSignIn(redirectTo)

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const value = (step.kind === 'code' ? step.email : email).trim().toLowerCase()
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
    await finish()
  }

  if (step.kind === 'email') {
    return (
      <form onSubmit={sendCode} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="otp-email">Email</Label>
          <Input
            id="otp-email"
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
        <p className="text-center text-xs text-muted-foreground">No password needed. New here? This creates your account.</p>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setStep({ kind: 'email' })}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Use a different email
      </button>
      <p className="text-sm text-muted-foreground">
        Enter the 6-digit code we sent to <span className="font-medium text-foreground">{step.email}</span>.
      </p>
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
        Didn't get it? Check spam, or{' '}
        <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => sendCode()} disabled={busy !== null}>
          resend the code
        </button>
      </p>
    </div>
  )
}
