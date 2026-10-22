import { createFileRoute } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { Container } from '@/features/marketing/container'
import { FinalCta } from '@/features/marketing/final-cta'
import { JsonLd } from '@/features/marketing/json-ld'
import { MarketingLayout } from '@/features/marketing/marketing-layout'
import { PageIntro } from '@/features/marketing/page-intro'
import { PayoutsSection } from '@/features/marketing/payouts-section'
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
        lead="Four steps from sign-up to getting paid. Every application and every submission is checked by a person on our team."
      />
      <Container className="py-14 sm:py-20">
        <ol className="space-y-6">
          {STEPS.map((step, i) => (
            <li
              key={step.id}
              id={step.id}
              className="mk-reveal grid scroll-mt-24 gap-6 rounded-3xl border bg-card p-6 sm:p-9 md:grid-cols-[8rem_1fr_1.3fr] md:gap-10"
            >
              <span aria-hidden className="font-display text-7xl leading-none font-bold text-primary tabular">
                {i + 1}
              </span>
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight">{step.title}</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{step.summary}</p>
              </div>
              <ul className="space-y-3">
                {step.details.map((d) => (
                  <li key={d} className="flex gap-3 leading-relaxed">
                    <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Container>
      <div className="border-t">
        <PayoutsSection />
      </div>
      <FinalCta />
    </MarketingLayout>
  )
}
