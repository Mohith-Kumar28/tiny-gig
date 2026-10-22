import { BadgeCheck, Clock, IndianRupee, MessageSquareText, Send } from 'lucide-react'
import { Container } from './container'
import { SectionHeading } from './section-heading'

const FLOW = [
  { Icon: Send, title: 'You submit', body: 'Link to your live post, plus screenshots if you like.' },
  { Icon: MessageSquareText, title: 'We review', body: 'Approved, changes requested with comments, or rejected.' },
  { Icon: Clock, title: 'Live hold', body: 'The post stays up for a set time, usually 24 hours. Then you upload its insights.' },
  { Icon: BadgeCheck, title: 'Approved', body: 'The payout is added to your TinyGig balance.' },
  { Icon: IndianRupee, title: 'Paid to UPI', body: 'Paid weekly to your UPI ID. You get an email with the UTR reference.' },
]

export function PayoutsSection() {
  return (
    <section aria-labelledby="payouts-title" className="py-20 sm:py-28">
      <Container>
        <SectionHeading
          id="payouts-title"
          title="Reviewed work. Real rupees. Straight to UPI."
          lead="We pay for work that follows the brief and stays live. Here is exactly what happens after you hit submit."
        />
        <ol className="relative mt-14 grid gap-8 md:grid-cols-5 md:gap-4">
          {/* connecting rail */}
          <span aria-hidden className="absolute top-6 left-6 bottom-6 w-px bg-border md:top-6 md:right-[10%] md:bottom-auto md:left-[10%] md:h-px md:w-auto" />
          {FLOW.map(({ Icon, title, body }, i) => {
            const last = i === FLOW.length - 1
            return (
              <li key={title} className="mk-reveal relative flex gap-5 md:flex-col md:items-center md:text-center">
                <span
                  className={
                    last
                      ? 'relative flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_-10px_var(--color-primary)]'
                      : 'relative flex size-12 shrink-0 items-center justify-center rounded-full border bg-card text-foreground'
                  }
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="pt-1 md:pt-0">
                  <h3 className="font-display text-lg font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground md:mx-auto md:max-w-[22ch]">{body}</p>
                </div>
              </li>
            )
          })}
        </ol>
        <p className="mk-reveal mt-12 max-w-2xl rounded-2xl bg-accent px-5 py-4 text-sm leading-relaxed text-accent-foreground">
          Payouts are sent by our team, not automatically, so every one is checked. Rejected work and posts removed during
          the hold are not paid.
        </p>
      </Container>
    </section>
  )
}
