import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { useAction } from '@/hooks/use-action'
import { ACCOUNT_LOSS } from '../disclaimer'
import { myConsentQuery } from '../queries'
import { acceptAccountLoss } from '../server/consent'

/** Asks again whenever the disclaimer's wording (version) changes, or if it was never recorded (R62). */
export function DisclaimerGate() {
  const { data } = useQuery(myConsentQuery())
  const [ticked, setTicked] = useState(false)
  const accept = useAction(() => acceptAccountLoss(), { invalidate: [['me', 'consent']] })
  const open = data ? !data.accountLoss : false
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Before you continue</DialogTitle>
          <DialogDescription>Please read this and confirm. We’ll ask again only if the wording changes.</DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/[0.07] p-4 text-sm">
          <Checkbox id="accept-account-loss" checked={ticked} onCheckedChange={(v) => setTicked(v === true)} className="mt-0.5" />
          <label htmlFor="accept-account-loss" className="font-medium">
            {ACCOUNT_LOSS.text}
          </label>
        </div>
        <DialogFooter>
          <Button disabled={!ticked || accept.isPending} onClick={() => accept.mutate()}>
            {accept.isPending ? <Spinner /> : null}I understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
