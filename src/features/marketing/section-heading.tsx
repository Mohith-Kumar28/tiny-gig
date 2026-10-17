import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SectionHeadingProps = { id: string; title: ReactNode; lead?: ReactNode; className?: string; as?: 'h1' | 'h2' }

export function SectionHeading({ id, title, lead, className, as: Tag = 'h2' }: SectionHeadingProps) {
  return (
    <div className={cn('mk-reveal max-w-2xl', className)}>
      <Tag id={id} className="font-display text-4xl leading-[1.02] font-bold tracking-[-0.03em] text-balance sm:text-5xl">
        {title}
      </Tag>
      {lead && <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">{lead}</p>}
    </div>
  )
}
