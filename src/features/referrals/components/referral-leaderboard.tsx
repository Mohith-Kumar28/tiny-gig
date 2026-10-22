import { EmptyState } from '@/components/shared/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { getReferralStats } from '../server/referrals'

type Leader = Awaited<ReturnType<typeof getReferralStats>>['leaders'][number]

const HEAD = 'ledger-label h-9 px-2.5 font-semibold text-muted-foreground first:pl-4 last:pr-4'
const CELL = 'h-12 px-2.5 py-2 first:pl-4 last:pr-4'

/** Top referrers by referral count, with funnel conversion. */
export function ReferralLeaderboard({ leaders }: { leaders: Leader[] }) {
  if (!leaders.length) {
    return (
      <EmptyState
        title="No referrers yet"
        description="The top 10 referrers rank here once workers start sharing their referral links."
      />
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader className="bg-muted/45 [&_tr]:border-b-foreground/12">
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(HEAD, 'w-14')}>Rank</TableHead>
            <TableHead className={HEAD}>Referrer</TableHead>
            <TableHead className={cn(HEAD, 'text-right')}>Referred</TableHead>
            <TableHead className={cn(HEAD, 'text-right')}>Approved</TableHead>
            <TableHead className={cn(HEAD, 'text-right')}>First gig done</TableHead>
            <TableHead className={cn(HEAD, 'text-right')}>Conversion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaders.map((l, i) => (
            <TableRow key={l.referrerId}>
              <TableCell className={CELL}>
                <span className={cn('font-display tabular', i < 3 ? 'font-bold' : 'text-muted-foreground')}>{i + 1}</span>
              </TableCell>
              <TableCell className={cn(CELL, 'font-medium')}>
                <a href={`/admin/workers/${l.referrerId}`} className="underline-offset-4 hover:underline">
                  {l.name}
                </a>
              </TableCell>
              <TableCell className={cn(CELL, 'text-right font-semibold tabular')}>{formatNumber(l.total)}</TableCell>
              <TableCell className={cn(CELL, 'text-right tabular')}>{formatNumber(l.approved)}</TableCell>
              <TableCell className={cn(CELL, 'text-right tabular')}>{formatNumber(l.active)}</TableCell>
              <TableCell className={cn(CELL, 'text-right tabular text-muted-foreground')}>
                {l.total ? `${Math.round((l.active / l.total) * 100)}%` : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
