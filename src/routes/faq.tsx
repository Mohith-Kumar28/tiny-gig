import { createFileRoute } from '@tanstack/react-router'
import { Container } from '@/features/marketing/container'
import { CtaLink } from '@/features/marketing/cta-link'
import { faqPageJsonLd } from '@/features/marketing/faq-data'
import { FaqList } from '@/features/marketing/faq-list'
import { JsonLd } from '@/features/marketing/json-ld'
import { MarketingLayout } from '@/features/marketing/marketing-layout'
import { PageIntro } from '@/features/marketing/page-intro'
import { pageHead } from '@/features/marketing/seo'
import { SITE } from '@/lib/site'

export const Route = createFileRoute('/faq')({
  head: () =>
    pageHead({
      path: '/faq',
      title: `FAQ | ${SITE.name}`,
      description:
        'Answers about TinyGig: who can apply, approval time, karma requirements, getting selected for gigs, proof, the live hold, UPI payouts and referrals.',
    }),
  component: FaqPage,
})

function FaqPage() {
  return (
    <MarketingLayout>
      <JsonLd data={faqPageJsonLd()} />
      <PageIntro
        title="Frequently asked questions"
        lead="Everything about applying, getting selected, reviews and getting paid. If your question is not here, email us."
      />
      <Container className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.4fr_0.6fr] lg:gap-16">
        <FaqList headingLevel={2} />
        <aside aria-label="Contact" className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <p className="font-display text-2xl font-semibold leading-snug">Still have a question?</p>
          <p className="text-muted-foreground">
            Write to{' '}
            <a href={`mailto:${SITE.email}`} className="font-medium text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
              {SITE.email}
            </a>{' '}
            and a person on our team will reply.
          </p>
          <CtaLink href="/login" arrow>
            Apply now
          </CtaLink>
        </aside>
      </Container>
    </MarketingLayout>
  )
}
