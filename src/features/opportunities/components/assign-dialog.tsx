import { AlertTriangle, Ban } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useAction } from '@/hooks/use-action'
import { selectAccount } from '../server/selection'

export type AssignTarget = {
  accountId: string
  label: string
  workerName: string
  hard: { rule: string; message: string }[]
  soft: { rule: string; message: string }[]
}

/**
 * Confirms a pick. Risky picks are flagged, not silently blocked (R10): staff can override a
 * cooldown with a written reason, which is recorded on the assignment.
 */
export function AssignDialog({
  gigId,
  gigTitle,
  target,
  direct,
  onOpenChange,
  onDone,
}: {
  gigId: string
  gigTitle: string
  target: AssignTarget | null
  direct?: boolean
  onOpenChange: (o: boolean) => void
  onDone?: () => void
}) {
  const [reason, setReason] = useState('')
  useEffect(() => {
    if (target) setReason('')
  }, [target])
  const assign = useAction(
    () => selectAccount({ data: { gigId, accountId: target?.accountId ?? '', overrideReason: reason || undefined, direct } }),
    {
      success: () => `${target?.label} selected. The worker has been notified.`,
      invalidate: [['admin']],
      onSuccess: () => {
        onOpenChange(false)
        onDone?.()
      },
    },
  )
  const risky = (target?.soft.length ?? 0) > 0
  const blocked = (target?.hard.length ?? 0) > 0
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Assign {target?.label} to “{gigTitle}”?
          </DialogTitle>
          <DialogDescription>
            {target?.workerName} gets a notification and email with the deadline. Their rate is fixed now and won’t change later.
          </DialogDescription>
        </DialogHeader>
        {blocked ? (
          <div className="space-y-1.5 rounded-lg border border-destructive/30 bg-destructive/8 p-3 text-sm">
            {target?.hard.map((b) => (
              <p key={b.rule} className="flex gap-2 text-destructive">
                <Ban className="mt-0.5 size-3.5 shrink-0" /> {b.message}
              </p>
            ))}
            <p className="text-xs text-muted-foreground">These can’t be overridden.</p>
          </div>
        ) : risky ? (
          <div className="space-y-3">
            <div className="space-y-1.5 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <p className="font-medium">This pick breaks a cooldown:</p>
              {target?.soft.map((b) => (
                <p key={b.rule} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" /> {b.message}
                </p>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="override-reason">Why override? (recorded)</Label>
              <Textarea
                id="override-reason"
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Client asked for this account specifically"
              />
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={risky ? 'destructive' : 'default'}
            disabled={blocked || assign.isPending || (risky && reason.trim().length < 3)}
            onClick={() => assign.mutate(undefined)}
          >
            {assign.isPending ? <Spinner /> : null}
            {risky ? 'Override and assign' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
