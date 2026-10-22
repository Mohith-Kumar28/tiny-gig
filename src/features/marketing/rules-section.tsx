import { Container } from './container'

/** The honest part. Mirrors the cooldown defaults, the live hold, client privacy and the account-loss clause. */
const RULES = [
  {
    title: 'Your account, your words',
    body: 'You post from your own account and write it yourself. We never ask for your password.',
  },
  {
    title: 'Cooldowns keep accounts healthy',
    body: 'One gig a day, no repeat in the same community within a week, and limits per client. A locked gig tells you the rule and the date it opens.',
  },
  {
    title: 'Paid for work that stays up',
    body: 'Rejected work, and posts removed during the live hold, are not paid. Approved work always is.',
  },
  {
    title: 'Clients stay private',
    body: 'Gigs never show who they are for. You see the community, the brief and the pay.',
  },
  {
    title: 'Accounts can be lost',
    body: 'Platforms can restrict or ban any account. Your accounts are your responsibility, so only use ones you are willing to risk.',
  },
  {
    title: 'Every Monday, no minimum',
    body: 'Your approved balance goes into the weekly payout, however small, with a UTR reference for each one.',
  },
]

export function RulesSection() {
  return (
    <section id="rules" aria-labelledby="rules-title" className="scroll-mt-20 border-t py-20 sm:py-28">
      <Container>
        <h2 id="rules-title" className="max-w-2xl font-display text-4xl leading-[1] font-extrabold tracking-[-0.03em] sm:text-5xl">
          The rules, said plainly.
        </h2>
        <dl className="mt-14 border-t-2 border-foreground">
          {RULES.map((r) => (
            <div key={r.title} className="grid gap-x-10 gap-y-2 border-b py-6 sm:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
              <dt className="font-display text-xl font-bold">{r.title}</dt>
              <dd className="max-w-[60ch] leading-relaxed text-muted-foreground sm:pt-0.5">{r.body}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  )
}
