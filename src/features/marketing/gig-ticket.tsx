import { Clock, Users } from 'lucide-react'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { type ExampleGig, formatInr } from './example-gigs'
import { PLATFORM_LABEL, PlatformMark } from './platform-mark'

type GigTicketProps = { gig: ExampleGig; slotsLeft: string; className?: string; style?: CSSProperties }

/** A single example gig rendered as a tear-off ticket. Purely illustrative. */
export function GigTicket({ gig, slotsLeft, className, style }: GigTicketProps) {
  return (
    <article
      style={style}
      className={cn(
        'relative overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-[0_24px_60px_-30px_oklch(0.35_0.08_45/0.45)] dark:shadow-[0_24px_60px_-30px_oklch(0_0_0/0.8)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 p-5 pb-4">
        <div className="min-w-0 space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <PlatformMark platform={gig.platform} className="size-4 text-primary" title={PLATFORM_LABEL[gig.platform]} />
            <span className="truncate">{gig.where}</span>
          </p>
          <h3 className="font-display text-lg leading-snug font-semibold text-balance">{gig.task}</h3>
        </div>
        <p className="shrink-0 text-right">
          <span className="block font-mono text-2xl font-semibold tracking-tight tabular">{formatInr(gig.payout)}</span>
          <span className="text-xs text-muted-foreground">per slot</span>
        </p>
      </div>
      {/* perforation */}
      <div aria-hidden className="relative mx-5 border-t border-dashed">
        <span className="absolute -left-8 -top-3 size-6 rounded-full border bg-background" />
        <span className="absolute -right-8 -top-3 size-6 rounded-full border bg-background" />
      </div>
      <dl className="flex flex-wrap items-center gap-x-4 gap-y-2 p-5 pt-4 text-xs text-muted-foreground">
        {gig.requirement && (
          <div className="rounded-full bg-accent px-2.5 py-1 font-medium text-accent-foreground">
            <dt className="sr-only">Requirement</dt>
            <dd>{gig.requirement}</dd>
          </div>
        )}
        {gig.hold && (
          <div className="flex items-center gap-1.5">
            <dt>
              <Clock className="size-3.5" aria-label="Live hold" />
            </dt>
            <dd>{gig.hold}</dd>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <dt>
            <Users className="size-3.5" aria-label="Slots" />
          </dt>
          <dd>{slotsLeft}</dd>
        </div>
      </dl>
    </article>
  )
}
