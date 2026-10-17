import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { formatMoney } from '@/lib/format'
import type { BalanceRow } from './payout-columns'

export function CreatePayoutsDialog({
  rows,
  pending,
  onOpenChange,
  onConfirm,
}: {
  rows: BalanceRow[] | null
  pending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (note: string | undefined) => void
}) {
  const [note, setNote] = useState('')
  useEffect(() => {
    if (rows) setNote('')
  }, [rows])
  const total = (rows ?? []).reduce((s, r) => s + r.total, 0)
  const n = rows?.length ?? 0
  return (
    <Dialog open={!!rows} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Create {n} payout{n === 1 ? '' : 's'} · {formatMoney(total)}
          </DialogTitle>
          <DialogDescription>
            Each worker's current unpaid balance is locked into one pending payout. Pay them over UPI, then mark them paid on the
            Payouts tab.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            onConfirm(note.trim() || undefined)
          }}
        >
          <Label htmlFor="payout-note">Note (optional)</Label>
          <Input id="payout-note" autoFocus value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Weekly payout, 14 Oct" />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={pending || !n} onClick={() => onConfirm(note.trim() || undefined)}>
            {pending ? <Spinner /> : null}
            Create payouts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
