import { Container } from './container'
import { CtaLink } from './cta-link'

export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="relative overflow-hidden border-t py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-1/2 mx-auto h-[36rem] max-w-4xl rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--color-primary)_20%,transparent),transparent)]"
      />
      <Container className="relative flex flex-col items-start gap-8 sm:items-center sm:text-center">
        <h2
          id="final-cta-title"
          className="mk-reveal max-w-3xl font-display text-5xl leading-[0.98] font-bold tracking-[-0.035em] text-balance sm:text-7xl"
        >
          Apply once. Start claiming gigs.
        </h2>
        <p className="mk-reveal max-w-md text-lg text-muted-foreground">
          It takes a few minutes. Free to join, and we email you when you are approved.
        </p>
        <CtaLink href="/login" size="lg" arrow className="mk-reveal">
          Apply now
        </CtaLink>
      </Container>
    </section>
  )
}
