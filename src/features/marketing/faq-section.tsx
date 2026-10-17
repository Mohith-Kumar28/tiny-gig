import { SITE } from '@/lib/site'
import { Container } from './container'
import { FaqList } from './faq-list'
import { SectionHeading } from './section-heading'

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 border-t py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading id="faq-title" title="Questions, answered." />
          <p className="mt-5 text-muted-foreground">
            Still unsure? Write to{' '}
            <a href={`mailto:${SITE.email}`} className="font-medium text-foreground underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
              {SITE.email}
            </a>
            .
          </p>
        </div>
        <FaqList />
      </Container>
    </section>
  )
}
