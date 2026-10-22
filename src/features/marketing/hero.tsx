import type { CSSProperties } from 'react'
import { Container } from './container'
import { CtaLink } from './cta-link'
import { LedgerSample } from './ledger-sample'

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="ledger-paper relative overflow-hidden border-b [--line:2.25rem] [--margin:0.85rem] sm:[--margin:1.6rem] xl:[--margin:max(1.6rem,calc((100vw-74rem)/2+1rem))]"
    >
      <Container className="relative pt-12 pb-16 sm:pt-16 lg:pt-20 lg:pb-24">
        <h1
          id="hero-title"
          className="mk-rise max-w-[14ch] font-display text-[clamp(2.9rem,7.4vw,6rem)] leading-[0.92] font-extrabold tracking-[-0.035em] lg:max-w-none"
          style={{ '--i': 0 } as CSSProperties}
        >
          Get <span className="underline decoration-primary decoration-double decoration-[0.07em] underline-offset-[0.1em] [text-decoration-skip-ink:none]">paid</span> to post on Reddit.
        </h1>

        <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
          <div className="max-w-md">
            <p className="mk-rise text-lg leading-relaxed text-foreground/80 sm:text-xl" style={{ '--i': 1 } as CSSProperties}>
              Raise your hand for small posting gigs. We pick an account, you post, and the money lands in your UPI.
            </p>
            <div className="mk-rise mt-8 flex flex-wrap items-center gap-3" style={{ '--i': 2 } as CSSProperties}>
              <CtaLink href="/login" size="lg" arrow>
                Apply now
              </CtaLink>
              <CtaLink href="/how-it-works" size="lg" variant="ghost">
                How it works
              </CtaLink>
            </div>
          </div>
          <LedgerSample className="w-full max-w-xl lg:justify-self-end" />
        </div>
      </Container>
    </section>
  )
}
