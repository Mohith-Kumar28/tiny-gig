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
  align = 'left',
}: {
  column: Column<TData, TValue>
  title: string
  sort?: string
  onSearchChange: OnSearchChange
  className?: string
  /** Right-aligned (numeric) columns put the sort arrow first so the title lines up with the figures. */
  align?: 'left' | 'right'
}) {
  const key = column.columnDef.meta?.sortKey
  if (!key) return <span className={className}>{title}</span>
  const [field, dir] = (sort ?? '').split('.')
  const active = field === key
  const next = !active ? `${key}.desc` : dir === 'desc' ? `${key}.asc` : undefined
  // Only the sorted column carries an arrow; the others reveal theirs on hover, so idle heads stay quiet and narrow.
  const Icon = !active ? ChevronsUpDown : dir === 'desc' ? ArrowDown : ArrowUp
  return (
    <button
      type="button"
      onClick={() => onSearchChange({ sort: next })}
      className={cn(
        'group/sort relative inline-flex h-7 items-center gap-1 rounded-md px-1.5 uppercase transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring',
        align === 'right' ? '-mr-1.5 flex-row-reverse text-right' : '-ml-1.5 text-left',
        active && 'text-foreground',
        className,
      )}
      aria-label={`Sort by ${title}`}
      title={`Sort by ${title.toLowerCase()}`}
    >
      {title}
      <Icon
        aria-hidden
        className={cn(
          'size-3 shrink-0',
          !active &&
            cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover/sort:opacity-50 group-focus-visible/sort:opacity-50',
              align === 'right' ? '-left-3' : '-right-3',
            ),
        )}
      />
    </button>
  )
}
