import { ArrowRight, Gift } from 'lucide-react'
import { Container } from './container'

export function ReferralTeaser() {
  return (
    <section aria-labelledby="referral-title" className="pb-20 sm:pb-28">
      <Container>
        <div className="mk-reveal relative grid gap-8 overflow-hidden rounded-[2rem] bg-foreground p-8 text-background dark:border dark:bg-[color-mix(in_oklch,var(--color-primary)_9%,var(--color-card))] dark:text-foreground sm:p-12 md:grid-cols-[1fr_auto] md:items-end">
          <Gift aria-hidden strokeWidth={1.25} className="pointer-events-none absolute -top-8 -right-8 hidden size-56 sm:block text-primary opacity-30" />
          <div className="relative max-w-xl">
            <h2 id="referral-title" className="font-display text-4xl leading-[1.02] font-bold tracking-[-0.03em] sm:text-5xl">
              Bring a friend. <span className="text-primary">Earn when they do.</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed opacity-75">
              Every worker gets a referral link. When friends sign up with it, get approved and complete gigs, you can earn
              bonus rewards.
            </p>
          </div>
          <a
            href="/faq#referrals"
            className="relative inline-flex items-center gap-2 self-start rounded-full px-1 text-sm font-medium underline decoration-primary underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 md:self-end"
          >
            How referrals work <ArrowRight className="size-4" aria-hidden />
          </a>
        </div>
      </Container>
    </section>
  )
}
