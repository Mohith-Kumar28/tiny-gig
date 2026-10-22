import type { CSSProperties } from 'react'
import { StatusBadge } from '@/components/shared/status-badge'
import { cn } from '@/lib/utils'
import { PlatformMark } from './platform-mark'

/** One illustrative week from a worker's TinyGig ledger. Rates match the default L3 rates; not live data. */
const ENTRIES = [
  { day: 'Mon', date: '13', task: 'Comment', where: 'r/IndianGaming', status: 'approved', amount: 30 },
  { day: 'Tue', date: '14', task: 'Post', where: 'r/developersIndia', status: 'approved', amount: 85 },
  { day: 'Wed', date: '15', task: 'Comment', where: 'r/bangalore', status: 'rejected', amount: 30 },
  { day: 'Fri', date: '17', task: 'Post', where: 'r/IndiaInvestments', status: 'on_hold', amount: 85, note: 'live hold, 24h' },
] as const

const settled = ENTRIES.filter((e) => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0)

const STAMP: Record<(typeof ENTRIES)[number]['status'], string> = {
  approved: 'Approved',
  rejected: 'Removed',
  on_hold: 'On hold',
}

export function LedgerSample({ className }: { className?: string }) {
  return (
    <figure className={cn('relative', className)}>
      <div className="relative overflow-hidden rounded-md border border-foreground/20 bg-card">
        {/* ledger head */}
        <div className="flex items-baseline justify-between gap-3 border-b-2 border-primary/70 px-4 pt-3.5 pb-2.5 sm:px-5">
          <p className="font-display text-[0.95rem] font-bold">u/aarav_codes</p>
          <p className="ledger-label">Week of 13 Oct · L3</p>
        </div>
        <div className="grid grid-cols-[3.25rem_1fr_auto] border-b px-4 sm:grid-cols-[3.75rem_1fr_auto] sm:px-5" aria-hidden>
          <span className="ledger-label border-r border-primary/50 py-1.5">Date</span>
          <span className="ledger-label py-1.5 pl-3">Particulars</span>
          <span className="ledger-label py-1.5 text-right">₹</span>
        </div>
        <ol>
          {ENTRIES.map((e, i) => (
            <li
              key={e.date}
              className="mk-write grid grid-cols-[3.25rem_1fr_auto] items-center border-b border-dashed border-ruling px-4 sm:grid-cols-[3.75rem_1fr_auto] sm:px-5"
              style={{ '--i': i } as CSSProperties}
            >
              <span className="self-stretch border-r border-primary/50 py-3 leading-none">
                <span className="ledger-label block text-[0.62rem]">{e.day}</span>
                <span className="font-display text-lg font-bold tabular">{e.date}</span>
              </span>
              <span className="flex min-w-0 items-center gap-2.5 py-3 pl-3">
                <PlatformMark platform="reddit" className="size-4.5 text-foreground/70" title="Reddit" />
                <span className="min-w-0">
                  <span className="block text-[0.94rem] leading-snug font-semibold break-words">
                    {e.task} in {e.where}
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <StatusBadge status={e.status} label={STAMP[e.status]} />
                    {'note' in e ? <span className="text-xs text-muted-foreground">{e.note}</span> : null}
                  </span>
                </span>
              </span>
              <span
                className={cn(
                  'pl-3 text-right font-display text-lg font-bold tabular',
                  e.status === 'rejected' && 'ledger-struck text-muted-foreground',
                  e.status === 'on_hold' && 'text-muted-foreground',
                )}
              >
                {e.amount}
              </span>
            </li>
          ))}
        </ol>
        <div className="mk-write flex items-end justify-between gap-4 px-4 pt-4 pb-1 sm:px-5" style={{ '--i': ENTRIES.length } as CSSProperties}>
          <span className="text-sm font-semibold">Approved this week</span>
          <span className="font-display text-2xl font-extrabold">
            <span className="ledger-total">₹{settled}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 pt-2 pb-4 sm:px-5">
          <span className="text-sm text-ink">Paid to UPI on Mon 20 Oct</span>
          <span className="font-mono text-xs text-muted-foreground">UTR 429318507716</span>
        </div>
        {/* the settled stamp */}
        <span
          aria-hidden
          className="mk-settle pointer-events-none absolute right-24 bottom-14 rounded-[3px] border-[3px] border-double border-success/70 px-2 py-0.5 text-[0.72rem] font-bold tracking-[0.08em] text-success/80 uppercase [font-stretch:80%] [transform:rotate(-4deg)]"
          style={{ '--i': ENTRIES.length + 1 } as CSSProperties}
        >
          Paid
        </span>
      </div>
      <figcaption className="mt-3 text-sm text-muted-foreground">An example week. Real gigs, rates and slots change daily.</figcaption>
    </figure>
  )
}
