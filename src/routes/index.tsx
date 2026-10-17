import { createFileRoute } from '@tanstack/react-router'
import { ExampleGigsSection } from '@/features/marketing/example-gigs-section'
import { faqPageJsonLd } from '@/features/marketing/faq-data'
import { FaqSection } from '@/features/marketing/faq-section'
import { FinalCta } from '@/features/marketing/final-cta'
import { Hero } from '@/features/marketing/hero'
import { HowItWorksSection } from '@/features/marketing/how-it-works-section'
import { JsonLd } from '@/features/marketing/json-ld'
import { MarketingLayout } from '@/features/marketing/marketing-layout'
import { PayoutsSection } from '@/features/marketing/payouts-section'
import { PlatformsSection } from '@/features/marketing/platforms-section'
import { ReferralTeaser } from '@/features/marketing/referral-teaser'
import { RequirementsSection } from '@/features/marketing/requirements-section'
import { pageHead } from '@/features/marketing/seo'
import { organizationJsonLd, websiteJsonLd } from '@/features/marketing/structured-data'
import { SITE } from '@/lib/site'

export const Route = createFileRoute('/')({
  head: () => pageHead({ path: '/', title: SITE.title, description: SITE.description }),
  component: HomePage,
})

function HomePage() {
  return (
    <MarketingLayout>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd(), faqPageJsonLd()]} />
      <Hero />
      <HowItWorksSection />
      <PlatformsSection />
      <ExampleGigsSection />
      <RequirementsSection />
      <PayoutsSection />
      <ReferralTeaser />
      <FaqSection />
      <FinalCta />
    </MarketingLayout>
  )
}
