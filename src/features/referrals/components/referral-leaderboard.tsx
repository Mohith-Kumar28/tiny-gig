import { Trophy } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { getReferralStats } from '../server/referrals'

type Leader = Awaited<ReturnType<typeof getReferralStats>>['leaders'][number]

/** Top referrers by referral count, with funnel conversion. */
export function ReferralLeaderboard({ leaders }: { leaders: Leader[] }) {
  if (!leaders.length) {
    return <EmptyState icon={Trophy} title="No referrers yet" description="The top 10 referrers will rank here once referrals start coming in." />
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 w-12 text-xs font-medium">#</TableHead>
            <TableHead className="h-9 text-xs font-medium">Referrer</TableHead>
            <TableHead className="h-9 text-right text-xs font-medium">Referred</TableHead>
            <TableHead className="h-9 text-right text-xs font-medium">Approved</TableHead>
            <TableHead className="h-9 text-right text-xs font-medium">First gig done</TableHead>
            <TableHead className="h-9 text-right text-xs font-medium">Conversion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaders.map((l, i) => (
            <TableRow key={l.referrerId}>
              <TableCell className="py-2.5">
                <span
                  className={cn(
                    'inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular',
                    i === 0 ? 'bg-primary text-primary-foreground' : i < 3 ? 'bg-primary/12 text-primary' : 'text-muted-foreground',
                  )}
                >
                  {i + 1}
                </span>
              </TableCell>
              <TableCell className="py-2.5 font-medium">
                <a href={`/admin/workers/${l.referrerId}`} className="underline-offset-4 hover:underline">
                  {l.name}
                </a>
              </TableCell>
              <TableCell className="py-2.5 text-right tabular">{formatNumber(l.total)}</TableCell>
              <TableCell className="py-2.5 text-right tabular">{formatNumber(l.approved)}</TableCell>
              <TableCell className="py-2.5 text-right tabular">{formatNumber(l.active)}</TableCell>
              <TableCell className="py-2.5 text-right tabular text-muted-foreground">
                {l.total ? `${Math.round((l.active / l.total) * 100)}%` : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
