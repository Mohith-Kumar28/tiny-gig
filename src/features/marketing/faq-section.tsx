import { SITE } from '@/lib/site'
import { Container } from './container'
import { FaqList } from './faq-list'

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2 id="faq-title" className="font-display text-4xl leading-[1] font-extrabold tracking-[-0.03em] sm:text-5xl">
            Questions, answered.
          </h2>
          <p className="mt-5 text-muted-foreground">
            Still unsure? Write to{' '}
            <a href={`mailto:${SITE.email}`} className="font-semibold text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
              {SITE.email}
            </a>
            .
          </p>
          <p className="mt-6 max-w-sm border-t pt-6 text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Bring a friend.</span> Every worker gets a referral link, and you can
            earn a bonus when friends join with it and finish gigs.{' '}
            <a href="/faq#referrals" className="font-semibold text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
              How referrals work
            </a>
          </p>
        </div>
        <FaqList />
      </Container>
    </section>
  )
}
