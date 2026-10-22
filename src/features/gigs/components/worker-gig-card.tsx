import { Link } from '@tanstack/react-router'
import { Check, Hand, Lock, ShieldCheck, Timer } from 'lucide-react'
import { Countdown } from '@/components/shared/countdown'
import { Money } from '@/components/shared/money'
import { PlatformLabel } from '@/components/shared/platform-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { listAvailableGigs } from '../server/worker-gigs'
import { formatHours, slotsLeft, TASK_TYPE_LABELS } from './worker-gig-meta'

export type AvailableGig = Awaited<ReturnType<typeof listAvailableGigs>>[number]

export function WorkerGigCard({ gig }: { gig: AvailableGig }) {
  const left = slotsLeft(gig)
  const pct = gig.totalSlots ? (gig.claimedSlots / gig.totalSlots) * 100 : 100
  const ineligible = Boolean(gig.ineligible)
  const windowOpen = gig.interestClosesAt ? new Date(gig.interestClosesAt) > new Date() : false
  return (
    <Link
      to="/w/gigs/$gigId"
      params={{ gigId: gig.id }}
      className={cn(
        'group flex flex-col gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-accent/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
        ineligible && 'bg-muted/40 hover:bg-muted/60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn('min-w-0 space-y-1.5', ineligible && 'opacity-60')}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <PlatformLabel platform={gig.platform} community={gig.community} />
            <span aria-hidden>·</span>
            <span className="text-xs font-medium">{TASK_TYPE_LABELS[gig.taskType]}</span>
          </div>
          <h3 className="line-clamp-2 font-display text-base leading-snug font-semibold text-balance group-hover:underline group-hover:underline-offset-2">
            {gig.title}
          </h3>
        </div>
        <div className={cn('shrink-0 text-right', ineligible && 'opacity-60')}>
          <Money paise={gig.payoutAmount} className="font-display text-2xl font-semibold text-primary" />
          <p className="text-[11px] text-muted-foreground">per task</p>
        </div>
      </div>

      <div className={cn('space-y-1.5', ineligible && 'opacity-60')}>
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium tabular">
            {left} of {gig.totalSlots} slot{gig.totalSlots === 1 ? '' : 's'} left
          </span>
          {left <= 3 ? <span className="font-medium text-primary">Filling fast</span> : null}
        </div>
        <Progress value={pct} className="h-1.5" />
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
        <div className="-mx-4 -mb-4 flex items-center gap-2 rounded-b-xl border-t border-success/20 bg-success/10 px-4 py-2.5 text-xs font-medium text-success">
          <Check className="size-3.5" /> You’re in the running
        </div>
      ) : gig.interest === 'not_selected' ? (
        <div className="-mx-4 -mb-4 flex items-center gap-2 rounded-b-xl border-t bg-muted px-4 py-2.5 text-xs font-medium text-muted-foreground">
          Another account was picked this time
        </div>
      ) : ineligible ? (
        <div className="-mx-4 -mb-4 flex items-center gap-2 rounded-b-xl border-t bg-muted px-4 py-2.5 text-xs font-medium text-muted-foreground">
          <Lock className="size-3.5 shrink-0" />
          {gig.ineligible}
        </div>
      ) : windowOpen && gig.interestClosesAt ? (
        <div className="-mx-4 -mb-4 flex items-center gap-2 rounded-b-xl border-t border-primary/20 bg-primary/8 px-4 py-2.5 text-xs font-medium text-primary">
          <Hand className="size-3.5" /> Say you’re interested: <Countdown to={gig.interestClosesAt} prefix="closes" />
        </div>
      ) : null}
    </Link>
  )
}

export function WorkerGigCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton className="h-1.5 w-full" />
      <div className="flex gap-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-24" />
      </div>
    </div>
  )
}

