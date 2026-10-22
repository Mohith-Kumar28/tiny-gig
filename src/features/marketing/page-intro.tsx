import type { ReactNode } from 'react'
import { Container } from './container'

type PageIntroProps = { title: ReactNode; lead?: ReactNode; meta?: ReactNode }

/** Top-of-page block for inner marketing pages: a title written on ruled ledger paper. Renders the page's single h1. */
export function PageIntro({ title, lead, meta }: PageIntroProps) {
  return (
    <div className="ledger-paper border-b [--line:2.25rem] [--margin:0.85rem] sm:[--margin:1.6rem] xl:[--margin:max(1.6rem,calc((100vw-74rem)/2+1rem))]">
      <Container className="pt-14 pb-12 sm:pt-20 sm:pb-16">
        <h1 className="mk-rise max-w-3xl font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.035em] sm:text-6xl">
          {title}
        </h1>
        {lead && <p className="mk-rise mt-6 max-w-2xl text-lg leading-relaxed text-foreground/75 sm:text-xl">{lead}</p>}
        {meta && <p className="mt-6 text-sm text-muted-foreground">{meta}</p>}
      </Container>
    </div>
  )
}
