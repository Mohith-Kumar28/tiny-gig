import { Link } from '@tanstack/react-router'
import { Check, Hand, Lock, ShieldCheck, Timer } from 'lucide-react'
import { Countdown } from '@/components/shared/countdown'
import { PlatformLabel } from '@/components/shared/platform-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { listAvailableGigs } from '../server/worker-gigs'
import { PayAmount, payCaption } from './pay'
import { formatHours, slotsLeft, TASK_TYPE_LABELS } from './worker-gig-meta'

export type AvailableGig = Awaited<ReturnType<typeof listAvailableGigs>>[number]

export function WorkerGigCard({ gig }: { gig: AvailableGig }) {
  const left = slotsLeft(gig)
  const ineligible = Boolean(gig.ineligible)
  const windowOpen = gig.interestClosesAt ? new Date(gig.interestClosesAt) > new Date() : false
  return (
    <Link
      to="/w/gigs/$gigId"
      params={{ gigId: gig.id }}
      className={cn(
        'group flex flex-col gap-3.5 overflow-hidden rounded-lg border bg-card p-4 transition-colors hover:border-foreground/35 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
        ineligible && 'bg-muted/50',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn('min-w-0 space-y-1.5', ineligible && 'opacity-60')}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <PlatformLabel platform={gig.platform} community={gig.community} />
            <span className="ledger-label rounded-[3px] border px-1 py-px text-[0.62rem]">{TASK_TYPE_LABELS[gig.taskType]}</span>
          </div>
          <h3 className="line-clamp-2 font-display text-[1.05rem] leading-snug font-bold text-balance">
            {gig.title}
          </h3>
        </div>
        <div className={cn('shrink-0 text-right', ineligible && 'opacity-60')}>
          <PayAmount pay={gig.pay} className="font-display text-2xl font-extrabold" />
          <p className="text-[11px] text-muted-foreground">{payCaption(gig.pay)}</p>
        </div>
      </div>

      <div className={cn('flex items-center gap-2 text-xs', ineligible && 'opacity-60')}>
        <span className="font-semibold tabular">
          {left} of {gig.totalSlots} slot{gig.totalSlots === 1 ? '' : 's'} left
        </span>
        {left > 0 && left <= 3 ? <span className="ledger-label text-[0.62rem] text-primary">Filling fast</span> : null}
        {/* slots as tally ticks, taken ones filled */}
        {gig.totalSlots <= 30 ? (
          <span aria-hidden className="ml-auto flex gap-[3px]">
            {Array.from({ length: gig.totalSlots }, (_, i) => (
              <span key={i} className={cn('h-3 w-[3px] rounded-[1px]', i < gig.claimedSlots ? 'bg-foreground/70' : 'bg-foreground/12')} />
            ))}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Timer className="size-3.5" /> {formatHours(gig.claimWindowHours)} to finish
        </span>
        {gig.liveHoldHours > 0 ? (
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="size-3.5" /> Stay live {formatHours(gig.liveHoldHours)}
          </span>
        ) : null}
        {gig.endsAt ? <Countdown to={gig.endsAt} prefix="Closes" /> : null}
      </div>

      {gig.interest === 'interested' ? (
        <div className="-mx-4 -mb-4 flex items-center gap-2 border-t border-success/25 bg-success/8 px-4 py-2.5 text-xs font-medium text-success">
          <Check className="size-3.5" /> You’re in the running
        </div>
      ) : gig.interest === 'not_selected' ? (
        <div className="-mx-4 -mb-4 flex items-center gap-2 border-t bg-muted px-4 py-2.5 text-xs font-medium text-muted-foreground">
          Another account was picked this time
        </div>
      ) : ineligible ? (
        <div className="-mx-4 -mb-4 flex items-center gap-2 border-t bg-muted px-4 py-2.5 text-xs font-medium text-muted-foreground">
          <Lock className="size-3.5 shrink-0" />
          {gig.ineligible}
        </div>
      ) : windowOpen && gig.interestClosesAt ? (
        <div className="-mx-4 -mb-4 flex items-center gap-2 border-t border-primary/25 bg-primary/7 px-4 py-2.5 text-xs font-medium text-primary">
          <Hand className="size-3.5" /> Say you’re interested: <Countdown to={gig.interestClosesAt} prefix="closes" />
        </div>
      ) : null}
    </Link>
  )
}

export function WorkerGigCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-24" />
      </div>
    </div>
  )
}

