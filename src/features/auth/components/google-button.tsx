import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'
import { GoogleIcon } from './google-icon'

export function GoogleButton({ redirectTo }: { redirectTo?: string }) {
  const [busy, setBusy] = useState(false)
  const signIn = async () => {
    setBusy(true)
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: redirectTo ?? '/app' })
    if (error) {
      setBusy(false)
      toast.error(error.message ?? 'Google sign-in failed')
    }
  }
  return (
    <Button variant="outline" size="lg" className="w-full" onClick={signIn} disabled={busy}>
      {busy ? <Spinner /> : <GoogleIcon />}
      Continue with Google
    </Button>
  )
}
