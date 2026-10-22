import { Plus } from 'lucide-react'
import { FAQ, type FaqItem } from './faq-data'

/** Native <details> accordion: works without JavaScript and is fully keyboard accessible. */
export function FaqList({ items = FAQ, headingLevel = 3 }: { items?: FaqItem[]; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <div className="divide-y border-t-2 border-b border-t-foreground">
      {items.map((item) => (
        <details key={item.id} id={item.id} className="group scroll-mt-24">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 hover:text-ink [&::-webkit-details-marker]:hidden">
            <Heading className="font-display text-lg leading-snug font-bold sm:text-xl">{item.question}</Heading>
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[4px] border text-foreground transition-[transform,background-color] duration-200 group-open:rotate-45 group-open:border-foreground group-open:bg-foreground group-open:text-background">
              <Plus className="size-4" aria-hidden />
            </span>
          </summary>
          <p className="max-w-[65ch] pb-6 leading-relaxed text-muted-foreground">{item.answer}</p>
        </details>
      ))}
    </div>
  )
}
