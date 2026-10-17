import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Debounced search box bound to the `q` search param. */
export function DataTableSearch({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string | undefined
  onChange: (q: string | undefined) => void
  placeholder?: string
  className?: string
}) {
  const [local, setLocal] = useState(value ?? '')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => setLocal(value ?? ''), [value])
  const update = (v: string) => {
    setLocal(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(v.trim() || undefined), 300)
  }
  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={local}
        onChange={(e) => update(e.target.value)}
        placeholder={placeholder}
        className="h-8 pl-8 pr-7 [&::-webkit-search-cancel-button]:hidden"
        aria-label={placeholder}
      />
      {local ? (
        <button
          type="button"
          onClick={() => update('')}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}
