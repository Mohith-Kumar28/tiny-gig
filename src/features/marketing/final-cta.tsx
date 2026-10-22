import { Container } from './container'
import { CtaLink } from './cta-link'

/** The back cover: a full field of khata red. */
export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="bg-cloth py-20 text-cloth-foreground sm:py-28">
      <Container className="grid items-end gap-10 md:grid-cols-[1fr_auto]">
        <div>
          <h2 id="final-cta-title" className="max-w-3xl font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.035em] sm:text-7xl">
            Apply once. Get picked for gigs.
          </h2>
          <p className="mt-6 max-w-md text-lg text-cloth-foreground/80">Free to join. One short form, on your phone.</p>
        </div>
        <CtaLink href="/login" size="lg" variant="paper" arrow>
          Apply now
        </CtaLink>
      </Container>
    </section>
  )
}
