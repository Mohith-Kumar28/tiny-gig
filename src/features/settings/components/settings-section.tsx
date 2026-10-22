import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * One block of the settings page: the heading and a sentence of help on the left,
 * the controls on the right. Sections are ruled off from each other like pages of a register.
 */
export function SettingsSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('grid gap-x-10 gap-y-4 border-t pt-8 lg:grid-cols-[15rem_minmax(0,1fr)]', className)}>
      <div className="space-y-1.5">
        <h2 className="font-display text-base leading-snug font-bold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground text-pretty">{description}</p> : null}
        {actions ? <div className="pt-2">{actions}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}
