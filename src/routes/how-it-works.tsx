import { createFileRoute } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { Container } from '@/features/marketing/container'
import { FinalCta } from '@/features/marketing/final-cta'
import { JsonLd } from '@/features/marketing/json-ld'
import { MarketingLayout } from '@/features/marketing/marketing-layout'
import { PageIntro } from '@/features/marketing/page-intro'
import { RulesSection } from '@/features/marketing/rules-section'
import { pageHead } from '@/features/marketing/seo'
import { STEPS } from '@/features/marketing/steps-data'
import { howToJsonLd } from '@/features/marketing/structured-data'
import { SITE } from '@/lib/site'

export const Route = createFileRoute('/how-it-works')({
  head: () =>
    pageHead({
      path: '/how-it-works',
      title: `How it works | ${SITE.name}`,
      description:
        'How TinyGig works: apply once, get approved in 24 to 48 hours, get selected for paid Reddit and social media gigs, submit proof and get paid to your UPI ID.',
    }),
  component: HowItWorksPage,
})

function HowItWorksPage() {
  return (
    <MarketingLayout>
      <JsonLd data={howToJsonLd()} />
      <PageIntro
        title="How TinyGig works"
        lead="Four steps from sign-up to getting paid. A person on our team checks every application and every piece of work."
      />
      <Container className="py-14 sm:py-20">
        <ol className="border-t-2 border-foreground">
          {STEPS.map((step, i) => (
            <li
              key={step.id}
              id={step.id}
              className="grid scroll-mt-24 gap-x-10 gap-y-4 border-b py-10 md:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1.3fr)]"
            >
              <span aria-hidden className="font-display text-5xl leading-none font-extrabold text-primary tabular">
                {i + 1}
              </span>
              <div>
                <h2 className="font-display text-3xl leading-tight font-extrabold">{step.title}</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{step.summary}</p>
              </div>
              <ul className="space-y-3">
                {step.details.map((d) => (
                  <li key={d} className="grid grid-cols-[1.25rem_1fr] gap-2 leading-relaxed">
                    <Check className="mt-1 size-4 text-success" strokeWidth={2.5} aria-hidden />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Container>
      <RulesSection />
      <FinalCta />
    </MarketingLayout>
  )
}
