import { useEffect, useRef, useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Money } from '@/components/shared/money'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Spinner } from '@/components/ui/spinner'
import { useAction } from '@/hooks/use-action'
import { formatMoney } from '@/lib/format'
import { markPayoutsPaid } from '../server/payouts'

/** Copy button kept out of the Tab order so Tab jumps straight between UTR inputs. */
function QuickCopy({ value }: { value: string }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        toast.success(`Copied ${value}`)
      }}
      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label={`Copy ${value}`}
    >
      <Copy className="size-3" />
    </button>
  )
}

type Item = { id: string; workerName: string; upiId: string; amount: number; utrReference?: string | null }

/**
 * Confirms payment for one or more payouts, with an optional UTR per row.
 * Tab / Enter moves between inputs; ⌘/Ctrl+Enter confirms.
 */
export function MarkPaidDialog({
  payouts,
  onOpenChange,
  onDone,
}: {
  payouts: Item[] | null
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}) {
  const [utrs, setUtrs] = useState<Record<string, string>>({})
  const refs = useRef<(HTMLInputElement | null)[]>([])
  useEffect(() => {
    if (payouts) setUtrs(Object.fromEntries(payouts.map((p) => [p.id, p.utrReference ?? ''])))
  }, [payouts])

  const mark = useAction(
    (items: { id: string; utr?: string }[]) => markPayoutsPaid({ data: { items } }),
    {
      success: (r) => `${r.updated} payout${r.updated === 1 ? '' : 's'} marked paid · workers notified`,
      invalidate: [['admin']],
      onSuccess: () => {
        onDone?.()
        onOpenChange(false)
      },
    },
  )
  const confirm = () => {
    if (!payouts?.length) return
    mark.mutate(payouts.map((p) => ({ id: p.id, utr: utrs[p.id]?.trim() || undefined })))
  }
  const list = payouts ?? []
  const total = list.reduce((s, p) => s + p.amount, 0)
  const filled = list.filter((p) => utrs[p.id]?.trim()).length

  return (
    <Dialog open={!!payouts} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Mark {list.length} payout{list.length === 1 ? '' : 's'} as paid
          </DialogTitle>
          <DialogDescription>
            Only do this after the UPI transfer has gone through. Add the UTR / reference number if you have it; workers see it
            in their payment email.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] overflow-y-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 text-xs text-muted-foreground backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Worker</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium">UTR (optional)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((p, i) => (
                <tr key={p.id}>
                  <td className="px-3 py-1.5">
                    <div className="truncate font-medium">{p.workerName}</div>
                    <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <span className="truncate font-mono">{p.upiId}</span>
                      <QuickCopy value={p.upiId} />
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-0.5">
                      <Money paise={p.amount} />
                      <QuickCopy value={String(p.amount / 100)} />
                    </span>
                  </td>
                  <td className="w-56 px-3 py-1.5">
                    <Input
                      ref={(el) => {
                        refs.current[i] = el
                      }}
                      autoFocus={i === 0}
                      value={utrs[p.id] ?? ''}
                      maxLength={64}
                      onChange={(e) => setUtrs((u) => ({ ...u, [p.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                          e.preventDefault()
                          confirm()
                        } else if (e.key === 'Enter') {
                          e.preventDefault()
                          const next = refs.current[i + 1]
                          if (next) next.focus()
                          else confirm()
                        }
                      }}
                      placeholder="e.g. 412345678901"
                      className="h-8 font-mono text-xs"
                      aria-label={`UTR for ${p.workerName}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter className="items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="tabular">{filled}</span>/<span className="tabular">{list.length}</span> UTRs · <Kbd>Tab</Kbd> or{' '}
            <Kbd>Enter</Kbd> next · <Kbd>⌘ Enter</Kbd> confirm
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={mark.isPending || !list.length}>
              {mark.isPending ? <Spinner /> : null}
              Mark paid · {formatMoney(total)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
