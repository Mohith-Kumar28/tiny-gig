import { createFileRoute } from '@tanstack/react-router'
import { faqPageJsonLd } from '@/features/marketing/faq-data'
import { FaqSection } from '@/features/marketing/faq-section'
import { FinalCta } from '@/features/marketing/final-cta'
import { GigTimeline } from '@/features/marketing/gig-timeline'
import { Hero } from '@/features/marketing/hero'
import { JsonLd } from '@/features/marketing/json-ld'
import { LevelsSection } from '@/features/marketing/levels-section'
import { MarketingLayout } from '@/features/marketing/marketing-layout'
import { NeedsSection } from '@/features/marketing/needs-section'
import { RulesSection } from '@/features/marketing/rules-section'
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
      <GigTimeline />
      <LevelsSection />
      <NeedsSection />
      <RulesSection />
      <FaqSection />
      <FinalCta />
    </MarketingLayout>
  )
}
