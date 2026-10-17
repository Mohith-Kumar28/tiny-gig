import { Link, type LinkProps } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  to,
  search,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  tone?: 'default' | 'attention' | 'success'
  to?: LinkProps['to']
  search?: LinkProps['search']
  className?: string
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon ? (
          <Icon
            className={cn(
              'size-4 text-muted-foreground',
              tone === 'attention' && 'text-primary',
              tone === 'success' && 'text-success',
            )}
          />
        ) : null}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold tracking-tight tabular">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </>
  )
  const cls = cn(
    'rounded-xl border bg-card p-4 transition-colors',
    tone === 'attention' && 'border-primary/30 bg-primary/[0.04]',
    to && 'hover:border-foreground/20 hover:bg-accent/40',
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
