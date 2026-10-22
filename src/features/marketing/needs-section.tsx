import { Container } from './container'
import { type Platform, PLATFORM_LABEL, PlatformMark } from './platform-mark'

const NEEDS = [
  { title: '18 or older, living in India', body: 'Payouts go to Indian UPI IDs, and some gigs are for specific states.' },
  { title: 'A Reddit account', body: 'Older accounts with real activity get picked more. You can add more than one.' },
  { title: 'A UPI ID', body: 'Any UPI app. Every approved payout goes here.' },
  { title: 'A phone and an email', body: 'Sign in with Google or an email code. Everything works on a phone.' },
]

const ALSO: Platform[] = ['x', 'linkedin', 'threads', 'instagram']

export function NeedsSection() {
  return (
    <section aria-labelledby="needs-title" className="py-20 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <h2 id="needs-title" className="font-display text-4xl leading-[1] font-extrabold tracking-[-0.03em] sm:text-5xl">
            What you need to join.
          </h2>
          <p className="mt-5 max-w-sm text-lg leading-relaxed text-muted-foreground">
            No fees and no certificates. A person reads every application, usually within 24 to 48 hours.
          </p>
        </div>
        <ul className="border-t-2 border-foreground">
          {NEEDS.map((n, i) => (
            <li key={n.title} className="grid grid-cols-[2rem_1fr] gap-x-3 border-b py-5">
              <span className="ledger-label pt-1.5 tabular">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="font-display text-lg font-bold">{n.title}</p>
                <p className="mt-1 text-muted-foreground">{n.body}</p>
              </div>
            </li>
          ))}
          <li className="grid grid-cols-[2rem_1fr] gap-x-3 py-5">
            <PlatformMark platform="reddit" className="mt-0.5 size-5 text-foreground/70" title="" />
            <div>
              <p className="font-display text-lg font-bold">Most gigs are on Reddit</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
                <span>Some are on</span>
                {ALSO.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    <PlatformMark platform={p} className="size-4" title="" />
                    {PLATFORM_LABEL[p]}
                  </span>
                ))}
              </p>
            </div>
          </li>
        </ul>
      </Container>
    </section>
  )
}
