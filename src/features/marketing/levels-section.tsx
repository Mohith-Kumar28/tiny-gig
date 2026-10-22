import type { CSSProperties } from 'react'
import { Container } from './container'

/** Account-age levels (R24/R25). Boundaries are fixed in the rules engine; rates are configured by staff. */
const BANDS = [
  { level: 'Warm-up', span: 'First 14 days', grow: 1.2, note: 'Warm-up tasks only, unpaid' },
  { level: 'L1', span: '14 days to 3 months', grow: 1.4 },
  { level: 'L2', span: '3 to 6 months', grow: 1.5 },
  { level: 'L3', span: '6 to 12 months', grow: 2 },
  { level: 'L4', span: '12 months and older', grow: 2.2 },
] as const

export function LevelsSection() {
  return (
    <section aria-labelledby="levels-title" className="border-t py-20 sm:py-28">
      <Container>
        <div className="max-w-2xl">
          <h2 id="levels-title" className="font-display text-4xl leading-[1] font-extrabold tracking-[-0.03em] sm:text-5xl">
            Older accounts earn more.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Reddit posts and comments pay by the age of the account doing them. A post pays ₹60 to ₹100 and a comment ₹20
            to ₹40, and every gig shows your exact rate before you raise your hand. It is locked the moment your account is picked.
          </p>
        </div>

        {/* the age ruler: across on wide screens, down on phones */}
        <ol className="mt-14 flex flex-col sm:flex-row">
          {BANDS.map((b, i) => (
            <li key={b.level} className="flex sm:flex-[var(--g)_1_0%] sm:flex-col" style={{ '--g': b.grow } as CSSProperties}>
              <span
                aria-hidden
                className={
                  i === 0
                    ? 'w-3 shrink-0 border-x border-t border-dashed border-foreground/40 sm:h-3 sm:w-auto sm:border-y sm:border-r-0'
                    : 'w-3 shrink-0 border-t-2 border-foreground sm:h-3 sm:w-auto sm:border-t-0 sm:border-l-2'
                }
                style={i === 0 ? undefined : { background: `color-mix(in oklch, var(--foreground) ${i * 18}%, transparent)` }}
              />
              <div className="flex-1 border-t border-foreground/25 py-3 pr-3 pl-4 sm:border-t-0 sm:border-l sm:pt-4 sm:pb-0 sm:pl-3">
                <p className={i === 0 ? 'font-display text-xl font-bold text-muted-foreground' : 'font-display text-2xl font-extrabold sm:text-3xl'}>
                  {b.level}
                </p>
                <p className="mt-1 text-sm font-medium">{b.span}</p>
                {'note' in b ? <p className="mt-1 text-sm text-muted-foreground">{b.note}</p> : null}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-2xl text-sm text-muted-foreground">
          Accounts move up a level on their own as they get older, and we tell you when one does. Gigs on other platforms pay a
          flat rate, shown on each gig.
        </p>
      </Container>
    </section>
  )
}
