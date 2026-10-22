import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CheckCheck, Clock, RotateCcw, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CopyButton } from '@/components/shared/copy-button'
import { Money } from '@/components/shared/money'
import { formatDateTime, RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useAction } from '@/hooks/use-action'
import { cn } from '@/lib/utils'
import { payoutItemsQuery } from '../queries'
import { setPayoutStatus } from '../server/payouts'
import type { PayoutRow } from './payout-columns'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center gap-3 py-2 text-sm">
      <dt className="ledger-label">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1">{children}</dd>
    </div>
  )
}

export function PayoutSheet({
  payout: p,
  onOpenChange,
  onMarkPaid,
}: {
  payout: PayoutRow | null
  onOpenChange: (open: boolean) => void
  onMarkPaid: (p: PayoutRow) => void
}) {
  const { data: items, isLoading } = useQuery({ ...payoutItemsQuery(p?.id ?? ''), enabled: !!p })
  const [failing, setFailing] = useState(false)
  const [note, setNote] = useState('')
  useEffect(() => {
    setFailing(false)
    setNote('')
  }, [p?.id])

  const setStatus = useAction(
    (v: { status: 'processing' | 'failed' | 'pending'; note?: string }) => setPayoutStatus({ data: { id: p!.id, ...v } }),
    {
      success: (_r, v) =>
        v.status === 'failed' ? 'Marked failed · items released back to the balance' : v.status === 'processing' ? 'Marked processing' : 'Moved back to pending',
      invalidate: [['admin']],
      onSuccess: () => onOpenChange(false),
    },
  )
  const open = p && p.status !== 'paid' && p.status !== 'failed'

  return (
    <Sheet open={!!p} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="font-display text-2xl">
            {p ? (
              <Money
                paise={p.amount}
                className={p.status === 'paid' ? 'ledger-total font-bold' : p.status === 'failed' ? 'ledger-struck font-bold' : 'font-bold'}
              />
            ) : (
              'Payout'
            )}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            {p ? <StatusBadge status={p.status} /> : null}
            {p ? (
              <span>
                to{' '}
                <Link to="/admin/workers/$userId" params={{ userId: p.workerId }} className="font-medium text-foreground hover:underline">
                  {p.workerName}
                </Link>
              </span>
            ) : null}
          </SheetDescription>
        </SheetHeader>
        {p ? (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <dl className="divide-y">
              <Row label="UPI ID">
                <span className="truncate font-mono text-xs">{p.upiId}</span>
                <CopyButton value={p.upiId} />
              </Row>
              <Row label="Amount">
                <Money paise={p.amount} />
                <CopyButton value={String(p.amount / 100)} />
              </Row>
              <Row label="Phone">
                <span className="tabular">{p.phone}</span>
                <CopyButton value={p.phone} />
              </Row>
              <Row label="Created">{formatDateTime(p.createdAt)}</Row>
              {p.paidAt ? <Row label="Paid">{formatDateTime(p.paidAt)}</Row> : null}
              {p.utrReference ? (
                <Row label="UTR">
                  <span className="font-mono text-xs tracking-wide">{p.utrReference}</span>
                  <CopyButton value={p.utrReference} />
                </Row>
              ) : null}
              {p.note ? <Row label="Note">{p.note}</Row> : null}
              <Row label="Payout ID">
                <span className="truncate font-mono text-xs text-muted-foreground">{p.id}</span>
              </Row>
            </dl>

            <h3 className="mt-5 mb-2 ledger-label">What this pays for</h3>
            {isLoading || !items ? (
              <div className="space-y-2">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            ) : items.gigs.length + items.rewards.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {p.status === 'failed' ? 'Items were released back to the worker balance.' : 'No items attached.'}
              </p>
            ) : (
              <ul className="divide-y overflow-hidden rounded-lg border text-sm">
                {items.gigs.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate">{g.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Approved <RelativeTime date={g.decidedAt} />
                      </div>
                    </div>
                    <Money paise={g.amount} className="font-display font-bold" />
                  </li>
                ))}
                {items.rewards.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate">{r.program}</div>
                      <div className="text-xs text-muted-foreground">Referral reward · {r.role}</div>
                    </div>
                    <Money paise={r.amount} className="font-display font-bold" />
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 bg-muted/40 px-3 py-2">
                  <span className="ledger-label">Total</span>
                  <Money
                    paise={items.gigs.reduce((n, g) => n + g.amount, 0) + items.rewards.reduce((n, r) => n + r.amount, 0)}
                    className={cn('font-display font-bold', p.status === 'paid' && 'ledger-total')}
                  />
                </li>
              </ul>
            )}

            {failing ? (
              <div className="mt-5 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <Label htmlFor="fail-note">Why did it fail?</Label>
                <Textarea
                  id="fail-note"
                  autoFocus
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. UPI ID invalid, bank declined…"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  The {items ? items.gigs.length + items.rewards.length : ''} items go back to the worker's unpaid balance so you can pay
                  them again later.
                </p>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setFailing(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ status: 'failed', note: note.trim() || undefined })}
                  >
                    {setStatus.isPending ? <Spinner /> : null}
                    Mark failed
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {open && !failing ? (
          <SheetFooter className="flex-row flex-wrap border-t">
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setFailing(true)}>
              <XCircle /> Failed
            </Button>
            {p.status === 'pending' ? (
              <Button variant="outline" className="flex-1" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ status: 'processing' })}>
                <Clock /> Processing
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ status: 'pending' })}>
                <RotateCcw /> Back to pending
              </Button>
            )}
            <Button className="flex-1" onClick={() => onMarkPaid(p)}>
              <CheckCheck /> Mark paid
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
