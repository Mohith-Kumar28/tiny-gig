import type { CSSProperties } from 'react'
import { Container } from './container'
import { CtaLink } from './cta-link'
import { EXAMPLE_GIGS } from './example-gigs'
import { GigTicket } from './gig-ticket'

const STACK = [
  { gig: EXAMPLE_GIGS[1], slots: '8 of 20 slots left', r: '-4deg', r0: '-9deg', pos: 'self-start sm:top-0 sm:left-2' },
  { gig: EXAMPLE_GIGS[0], slots: '31 of 50 slots left', r: '3deg', r0: '8deg', pos: 'self-end -mt-3 sm:mt-0 sm:top-[9.75rem] sm:right-0' },
  { gig: EXAMPLE_GIGS[4], slots: '14 of 25 slots left', r: '-1.5deg', r0: '-5deg', pos: 'self-start ml-2 -mt-3 sm:mt-0 sm:ml-0 sm:top-[19.5rem] sm:left-8' },
]

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* warm wash behind the ticket stack */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-20 size-[42rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--color-primary)_22%,transparent),transparent)] dark:bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent)]"
      />
      <Container className="relative grid items-center gap-14 pt-12 pb-20 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-20 lg:pb-28">
        <div className="max-w-xl">
          <p className="mk-rise mb-6 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-sm text-muted-foreground" style={{ '--i': 0 } as CSSProperties}>
            <span className="font-mono font-semibold text-primary">₹</span>
            Paid gigs for people in India
          </p>
          <h1
            id="hero-title"
            className="mk-rise font-display text-[clamp(2.9rem,9vw,5.4rem)] leading-[0.95] font-bold tracking-[-0.035em] text-balance"
            style={{ '--i': 1 } as CSSProperties}
          >
            Get paid to post on <span className="text-primary">Reddit.</span>
          </h1>
          <p className="mk-rise mt-6 max-w-md text-lg leading-relaxed text-muted-foreground sm:text-xl" style={{ '--i': 2 } as CSSProperties}>
            Claim small paid tasks on Reddit, X, LinkedIn and Threads. Do them from your phone. Get paid by UPI.
          </p>
          <div className="mk-rise mt-9 flex flex-wrap items-center gap-3" style={{ '--i': 3 } as CSSProperties}>
            <CtaLink href="/login" size="lg" arrow>
              Apply now
            </CtaLink>
            <CtaLink href="/how-it-works" size="lg" variant="ghost">
              How it works
            </CtaLink>
          </div>
        </div>

        <figure className="relative mx-auto w-full max-w-md lg:mr-0">
          <div className="mk-stack relative flex flex-col sm:block sm:h-[30.5rem]">
            {STACK.map((item, i) => (
              <GigTicket
                key={item.gig.task}
                gig={item.gig}
                slotsLeft={item.slots}
                className={`mk-ticket relative w-[94%] sm:absolute sm:w-[88%] ${item.pos}`}
                style={{ '--mk-r': item.r, '--mk-r0': item.r0, '--i': i } as CSSProperties}
              />
            ))}
          </div>
          <figcaption className="mt-4 text-center text-sm text-muted-foreground lg:text-left">
            Example gigs. Real tasks, payouts and slots change daily.
          </figcaption>
        </figure>
      </Container>
    </section>
  )
}
