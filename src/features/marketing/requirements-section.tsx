import { AtSign, IdCard, MapPin, Smartphone, UserRound, Wallet } from 'lucide-react'
import { Container } from './container'
import { SectionHeading } from './section-heading'

const NEEDS = [
  { Icon: UserRound, title: '18 or older, living in India', body: 'Payouts go to Indian UPI IDs, and some gigs target specific states.' },
  { Icon: AtSign, title: 'A Reddit account', body: 'Share your profile link, account age and karma. Older, active accounts unlock more gigs.' },
  { Icon: Wallet, title: 'A UPI ID', body: 'Any UPI app works. This is where every approved payout is sent.' },
  { Icon: Smartphone, title: 'A phone and an email', body: 'Sign in with Google or an email code. Everything works on mobile.' },
]

export function RequirementsSection() {
  return (
    <section aria-labelledby="requirements-title" className="border-y bg-secondary/50 py-20 sm:py-28 dark:bg-card/40">
      <Container>
        <SectionHeading
          id="requirements-title"
          title="What you need to join."
          lead="No fees, no experience certificates. A real person reviews every application, usually within 24 to 48 hours."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {NEEDS.map(({ Icon, title, body }) => (
            <div key={title} className="mk-reveal rounded-3xl border bg-background p-6">
              <Icon className="size-6 text-primary" aria-hidden strokeWidth={1.75} />
              <h3 className="mt-4 font-semibold sm:mt-6">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
          <div className="mk-reveal flex flex-col gap-4 rounded-3xl border border-dashed p-6 sm:col-span-2 sm:flex-row sm:items-center sm:gap-6 lg:col-span-4">
            <div className="flex shrink-0 gap-2 text-primary">
              <IdCard className="size-6" aria-hidden strokeWidth={1.75} />
              <MapPin className="size-6" aria-hidden strokeWidth={1.75} />
            </div>
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">Some gigs ask for more,</span>{' '}
              <span className="text-muted-foreground">
                like a minimum karma, account age or state. You will see those on the gig before you raise your hand.
              </span>
            </p>
          </div>
        </div>
      </Container>
    </section>
  )
}
