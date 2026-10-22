import { Link } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'
import { CopyButton } from '@/components/shared/copy-button'
import { Money } from '@/components/shared/money'
import { PageHeader } from '@/components/shared/page-header'
import { formatDate } from '@/components/shared/relative-time'
import { StatCard, StatGrid } from '@/components/shared/stat-card'
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

function PanelHead({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
      <h2 className="font-display text-base font-bold">{title}</h2>
      {children}
    </div>
  )
}

export function WorkerPayments({ earnings, upiId }: { earnings: Earnings; upiId: string | undefined }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Earnings" description="Approved work adds to your balance. Balances are paid to your UPI every week." />

      <div className="space-y-3">
        <StatGrid className="grid-cols-2 sm:grid-cols-3">
          <StatCard
            className="col-span-2 sm:col-span-1"
            label="Unpaid balance"
            value={formatMoney(earnings.unpaid)}
            hint={earnings.unpaid ? 'Goes out with the next weekly payout' : 'Approved work lands here'}
          />
          <StatCard label="In payout" value={formatMoney(earnings.processing)} hint="Being sent now" />
          <StatCard
            label="Paid"
            value={<span className={earnings.paid ? 'ledger-total' : undefined}>{formatMoney(earnings.paid)}</span>}
            hint={`${formatMoney(earnings.lifetime)} earned in total`}
          />
        </StatGrid>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-card px-4 py-2.5">
          <span className="ledger-label">Paid to UPI ID</span>
          {upiId === undefined ? (
            <Skeleton className="h-5 w-36" />
          ) : (
            <span className="inline-flex min-w-0 items-center gap-1">
              <span className="truncate font-mono text-sm font-medium">{upiId}</span>
              <CopyButton value={upiId} className="size-7" />
            </span>
          )}
          <Link
            to="/w/profile"
            hash="payments"
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-ink underline-offset-2 hover:underline"
          >
            <Pencil className="size-3" /> Change
          </Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border bg-card">
        <PanelHead title="Payout history">
          {earnings.payouts.length ? <span className="text-xs text-muted-foreground">Every Monday</span> : null}
        </PanelHead>
        {earnings.payouts.length ? (
          <>
            {/* Phone: one ruled line per payout */}
            <ul className="divide-y sm:hidden">
              {earnings.payouts.map((p) => (
                <li key={p.id} className="grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-1 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium tabular">{formatDate(p.paidAt ?? p.createdAt)}</p>
                    {p.utrReference ? (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="ledger-label text-[0.64rem]">UTR</span> <Utr value={p.utrReference} />
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-display text-base font-bold tabular">
                      <span className={p.status === 'paid' ? 'ledger-total' : undefined}>{formatMoney(p.amount)}</span>
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.status === 'failed' && p.note ? <p className="col-span-2 text-xs text-destructive">{p.note}</p> : null}
                </li>
              ))}
            </ul>
            {/* Wider screens: the ledger table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Date</TableHead>
                    <TableHead>UPI ID</TableHead>
                    <TableHead>UTR</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-4 tabular">{formatDate(p.paidAt ?? p.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{p.upiId}</TableCell>
                      <TableCell>
                        <Utr value={p.utrReference} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                        {p.status === 'failed' && p.note ? <p className="mt-1 text-xs text-destructive">{p.note}</p> : null}
                      </TableCell>
                      <TableCell className="pr-4 text-right font-display font-bold tabular">
                        <span className={p.status === 'paid' ? 'ledger-total' : undefined}>{formatMoney(p.amount)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="px-4 py-6 text-sm">
            <p className="font-medium">No payouts yet</p>
            <p className="mt-1 text-muted-foreground">
              Every Monday we send your unpaid balance to your UPI ID. Each payout shows up here with its UTR number, so you can
              match it with your bank app.
            </p>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <PanelHead title="Recent approved work" />
        {earnings.recent.length ? (
          <ul className="divide-y">
            {earnings.recent.map((r) => (
              <li key={r.id}>
                <Link
                  to="/w/work/$submissionId"
                  params={{ submissionId: r.id }}
                  className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm leading-snug font-medium">{r.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.decidedAt ? `Approved ${formatDate(r.decidedAt)}` : 'Approved'} ·{' '}
                      {r.payoutId ? 'Paid out' : 'In balance'}
                    </p>
                  </div>
                  <Money paise={r.amount} className="shrink-0 font-display text-base font-bold" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-start gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">No approved work yet</p>
              <p className="mt-1 text-muted-foreground">
                Raise your hand on a gig, post when you’re picked, and the pay shows up here once approved.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/w/gigs">Find gigs</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
