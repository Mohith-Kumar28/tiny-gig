import type { Column } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OnSearchChange } from './types'

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  sort,
  onSearchChange,
  className,
}: {
  column: Column<TData, TValue>
  title: string
  sort?: string
  onSearchChange: OnSearchChange
  className?: string
}) {
  const key = column.columnDef.meta?.sortKey
  if (!key) return <span className={className}>{title}</span>
  const [field, dir] = (sort ?? '').split('.')
  const active = field === key
  const next = !active ? `${key}.desc` : dir === 'desc' ? `${key}.asc` : undefined
  const Icon = !active ? ChevronsUpDown : dir === 'desc' ? ArrowDown : ArrowUp
  return (
    <button
      type="button"
      onClick={() => onSearchChange({ sort: next })}
      className={cn(
        '-ml-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-left hover:bg-accent hover:text-accent-foreground',
        active && 'text-foreground',
        className,
      )}
      aria-label={`Sort by ${title}`}
    >
      {title}
      <Icon className={cn('size-3.5', !active && 'opacity-40')} />
    </button>
  )
}
