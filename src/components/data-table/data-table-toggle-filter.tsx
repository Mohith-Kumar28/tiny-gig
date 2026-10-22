import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** One-click on/off filter that sits beside the faceted filters and shares their selected (ink) look. */
export function DataTableToggleFilter({
  active,
  onToggle,
  count,
  children,
}: {
  active: boolean
  onToggle: () => void
  /** Optional figure shown after the label, e.g. how many rows the filter would leave. */
  count?: number
  children: ReactNode
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        'h-8',
        active
          ? 'border-ink/40 bg-ink/[0.04] text-ink hover:bg-ink/[0.07] hover:text-ink'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
      {count != null ? (
        <span className={cn('rounded-md px-1 text-xs tabular', active ? 'bg-ink/10' : 'bg-muted text-muted-foreground')}>
          {count}
        </span>
      ) : null}
    </Button>
  )
}
