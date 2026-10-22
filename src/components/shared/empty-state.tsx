import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <Empty className={cn('rounded-lg border border-dashed bg-card/50 py-10', className)}>
      <EmptyHeader>
        {Icon ? <Icon className="size-5 text-muted-foreground" aria-hidden /> : null}
        <EmptyTitle className="font-display font-bold">{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}
