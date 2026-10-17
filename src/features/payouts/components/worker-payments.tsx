import { Link } from '@tanstack/react-router'
import { BadgeCheck, Hourglass, Pencil, Receipt, Wallet } from 'lucide-react'
import { CopyButton } from '@/components/shared/copy-button'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { PageHeader } from '@/components/shared/page-header'
import { formatDate } from '@/components/shared/relative-time'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney } from '@/lib/format'
import type { getMyEarnings } from '../server/payouts'

type Earnings = Awaited<ReturnType<typeof getMyEarnings>>

function Utr({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono text-xs">{value}</span>
      <CopyButton value={value} className="size-6" />
    </span>
  )
}

export function WorkerPayments({ earnings, upiId }: { earnings: Earnings; upiId: string | undefined }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Approved earnings collect in your balance. We send payouts to your UPI by hand, and you get the UTR number as proof."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Unpaid balance" value={<Money paise={earnings.unpaid} />} hint="Goes out in the next payout" icon={Wallet} tone={earnings.unpaid ? 'attention' : 'default'} />
        <StatCard label="In payout" value={<Money paise={earnings.processing} />} hint="Being sent now" icon={Hourglass} />
        <StatCard label="Paid" value={<Money paise={earnings.paid} />} hint={`${formatMoney(earnings.lifetime)} earned in total`} icon={BadgeCheck} tone="success" />
        <div className="col-span-2 flex flex-col justify-between gap-2 rounded-xl border bg-card p-4 lg:col-span-1">
          <span className="text-xs font-medium text-muted-foreground">Paid to UPI ID</span>
          {upiId === undefined ? (
            <Skeleton className="h-6 w-40" />
          ) : (
            <div className="flex items-center gap-1">
              <span className="truncate font-mono text-sm font-medium">{upiId}</span>
              <CopyButton value={upiId} />
            </div>
          )}
          <Button asChild variant="link" size="sm" className="h-auto justify-start p-0 text-xs">
            <Link to="/w/profile" hash="payments">
              <Pencil className="size-3" /> Change in profile
            </Link>
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Payout history</h2>
        {earnings.payouts.length ? (
          <>
            {/* Mobile cards */}
            <ul className="divide-y rounded-xl border bg-card sm:hidden">
              {earnings.payouts.map((p) => (
                <li key={p.id} className="space-y-1.5 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Money paise={p.amount} className="font-display text-lg font-semibold" />
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(p.paidAt ?? p.createdAt)}</span>
                    {p.utrReference ? (
                      <span className="inline-flex items-center gap-1">
                        UTR <Utr value={p.utrReference} />
                      </span>
                    ) : null}
                  </div>
                  {p.status === 'failed' && p.note ? <p className="text-xs text-destructive">{p.note}</p> : null}
                </li>
              ))}
            </ul>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border bg-card sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>UPI ID</TableHead>
                    <TableHead className="pr-4">UTR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-4">{formatDate(p.paidAt ?? p.createdAt)}</TableCell>
                      <TableCell>
                        <Money paise={p.amount} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.upiId}</TableCell>
                      <TableCell className="pr-4">
                        <Utr value={p.utrReference} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <EmptyState icon={Receipt} title="No payouts yet" description="When we send money to your UPI, it shows up here with the UTR number." />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Recent approved earnings</h2>
        {earnings.recent.length ? (
          <ul className="divide-y rounded-xl border bg-card">
            {earnings.recent.map((r) => (
              <li key={r.id}>
                <Link to="/w/work/$submissionId" params={{ submissionId: r.id }} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.decidedAt ? `Approved ${formatDate(r.decidedAt)}` : 'Approved'} · {r.payoutId ? 'Paid out' : 'In balance'}
                    </p>
                  </div>
                  <Money paise={r.amount} className="shrink-0 text-sm text-success" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={BadgeCheck}
            title="No approved work yet"
            description="Finish a gig and get it approved to start earning."
            action={
              <Button asChild>
                <Link to="/w/gigs">Find gigs</Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  )
}
