import type { ReactNode } from 'react'
import { Container } from './container'

type PageIntroProps = { title: ReactNode; lead?: ReactNode; meta?: ReactNode }

/** Top-of-page block for inner marketing pages. Renders the page's single h1. */
export function PageIntro({ title, lead, meta }: PageIntroProps) {
  return (
    <div className="relative overflow-hidden border-b">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[32rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent)]"
      />
      <Container className="relative pt-14 pb-14 sm:pt-20 sm:pb-16">
        <h1 className="mk-rise max-w-3xl font-display text-5xl leading-[0.98] font-bold tracking-[-0.035em] text-balance sm:text-6xl">
          {title}
        </h1>
        {lead && <p className="mk-rise mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">{lead}</p>}
        {meta && <p className="mt-6 text-sm text-muted-foreground">{meta}</p>}
      </Container>
    </div>
  )
}
