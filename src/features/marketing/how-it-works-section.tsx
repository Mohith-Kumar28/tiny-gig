import { ArrowRight } from 'lucide-react'
import { Container } from './container'
import { SectionHeading } from './section-heading'
import { STEPS } from './steps-data'

export function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 py-20 sm:py-28">
      <Container>
        <SectionHeading id="how-title" title="From sign-up to UPI in four moves." />
        <ol className="mt-14 grid gap-px overflow-hidden rounded-3xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.id} className="mk-reveal flex flex-col gap-4 bg-background p-6 sm:p-7">
              <span aria-hidden className="font-display text-6xl leading-none font-bold text-primary/90 tabular">
                {i + 1}
              </span>
              <h3 className="font-display text-xl font-semibold">{step.title}</h3>
              <p className="text-[0.95rem] leading-relaxed text-muted-foreground">{step.summary}</p>
            </li>
          ))}
        </ol>
        <a
          href="/how-it-works"
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          Read the full walkthrough <ArrowRight className="size-4" aria-hidden />
        </a>
      </Container>
    </section>
  )
}
