import { Container } from './container'
import { EXAMPLE_GIGS, formatInr } from './example-gigs'
import { PLATFORM_LABEL, PlatformMark } from './platform-mark'
import { SectionHeading } from './section-heading'

export function ExampleGigsSection() {
  return (
    <section aria-labelledby="examples-title" className="py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            id="examples-title"
            title="You see the pay before you raise your hand."
            lead="Each gig lists the platform, the community, the brief, any requirements and the exact amount in rupees."
          />
          <p className="mt-6 inline-flex rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground">
            These are examples, not live gigs.
          </p>
        </div>

        <ul className="mk-reveal divide-y rounded-3xl border bg-card">
          {EXAMPLE_GIGS.map((gig) => (
            <li key={gig.task} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-5 sm:gap-5 sm:p-6">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <PlatformMark platform={gig.platform} className="size-5" title={PLATFORM_LABEL[gig.platform]} />
              </span>
              <div className="min-w-0">
                <p className="font-medium leading-snug">{gig.task}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {gig.where}
                  {gig.requirement && <span className="text-foreground/70">, {gig.requirement}</span>}
                </p>
              </div>
              <p className="font-mono text-xl font-semibold tracking-tight tabular sm:text-2xl">{formatInr(gig.payout)}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
