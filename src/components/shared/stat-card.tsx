import { Link, type LinkProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Figures set side by side like the columns of one ledger row: hairline gutters, no floating cards.
 * Put StatCards inside; give it the column count via className (e.g. "grid-cols-2 lg:grid-cols-4").
 */
export function StatGrid({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('grid gap-px overflow-hidden rounded-md border bg-border', className)}>{children}</div>
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  to,
  search,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  /** attention = something is waiting on you; success = settled money. */
  tone?: 'default' | 'attention' | 'success'
  to?: LinkProps['to']
  search?: LinkProps['search']
  className?: string
}) {
  const body = (
    <>
      <span className={cn('ledger-label', tone === 'attention' && 'text-primary')}>{label}</span>
      <div
        className={cn(
          'mt-1.5 font-display text-[1.65rem] leading-tight font-bold tabular',
          tone === 'attention' && 'text-primary',
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
    </>
  )
  const cls = cn(
    'group relative block bg-card px-4 py-3.5 transition-colors',
    to && 'hover:bg-accent/60 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
    className,
  )
  if (to) {
    return (
      <Link to={to} search={search} className={cls}>
        {body}
      </Link>
    )
  }
  return <div className={cls}>{body}</div>
}
