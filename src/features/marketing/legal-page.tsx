import type { ReactNode } from 'react'
import { Container } from './container'
import { MarketingLayout } from './marketing-layout'
import { PageIntro } from './page-intro'

type LegalPageProps = { title: string; lead: string; updated: string; children: ReactNode }

export function LegalPage({ title, lead, updated, children }: LegalPageProps) {
  return (
    <MarketingLayout>
      <article>
        <PageIntro title={title} lead={lead} meta={`Last updated ${updated}`} />
        <Container className="py-14 sm:py-20">
          <div className="prose prose-neutral max-w-[68ch] dark:prose-invert prose-headings:font-display prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-2xl prose-a:text-primary prose-a:underline-offset-4 prose-li:my-1">
            {children}
          </div>
        </Container>
      </article>
    </MarketingLayout>
  )
}
