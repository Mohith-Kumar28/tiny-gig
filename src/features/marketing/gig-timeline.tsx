import { Container } from './container'

/** The life of one gig, in the order and timings the product actually runs. */
const MOMENTS = [
  {
    when: '10:00',
    title: 'A gig goes live',
    body: 'You get a push and an email with the community, the brief and what it pays for each of your accounts.',
  },
  {
    when: '10:00 to 10:10',
    title: 'Raise your hand',
    body: 'Tap “I’m interested” inside the 10-minute window. It reserves nothing and costs nothing.',
  },
  {
    when: '10:15',
    title: 'We pick one account per slot',
    body: 'Staff choose by fit: account age, karma, and how long since the account last did client work. If it isn’t you this time, we tell you.',
  },
  {
    when: 'Same day',
    title: 'Post it, send the link',
    body: 'Write it yourself, from the selected account, following the brief and the community’s rules. Reply to comments on it.',
  },
  {
    when: '24 hours later',
    title: 'Upload the insights',
    body: 'Keep the post up through the live hold, then send a screenshot of its insights. A reviewer approves it.',
  },
  {
    when: 'Monday',
    title: 'Paid to your UPI',
    body: 'Your approved balance goes into the weekly payout, sent to your UPI ID with the UTR reference by email.',
    settled: true,
  },
] as const

export function GigTimeline() {
  return (
    <section id="how-it-works" aria-labelledby="timeline-title" className="scroll-mt-20 py-20 sm:py-28">
      <Container>
        <h2 id="timeline-title" className="max-w-2xl font-display text-4xl leading-[1] font-extrabold tracking-[-0.03em] sm:text-5xl">
          One gig, from first ping to UPI.
        </h2>
        <ol className="mt-14 border-t-2 border-foreground">
          {MOMENTS.map((m) => (
            <li
              key={m.title}
              className="mk-write-scroll grid gap-x-8 gap-y-1 border-b py-6 sm:grid-cols-[11rem_minmax(0,18rem)_minmax(0,1fr)] sm:py-7"
            >
              <p className="ledger-label pt-1.5 text-ink">{m.when}</p>
              <h3 className="font-display text-xl leading-tight font-bold sm:text-2xl">
                {'settled' in m ? <span className="border-b-[3px] border-double border-current">{m.title}</span> : m.title}
              </h3>
              <p className="max-w-[52ch] leading-relaxed text-muted-foreground sm:pt-1">{m.body}</p>
            </li>
          ))}
        </ol>
        <a
          href="/how-it-works"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink"
        >
          The full walkthrough
        </a>
      </Container>
    </section>
  )
}
