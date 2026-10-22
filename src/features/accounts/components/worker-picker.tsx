import { useQuery } from '@tanstack/react-query'
import { Check, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminQuickSearch } from '@/features/analytics/server/admin-shell'
import { cn } from '@/lib/utils'

export type PickedWorker = { id: string; name: string; reddit: string }

/** Find a worker by name, email, phone or Reddit handle. */
export function WorkerPicker({ value, onChange }: { value: PickedWorker | null; onChange: (w: PickedWorker | null) => void }) {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200)
    return () => clearTimeout(t)
  }, [q])
  const { data } = useQuery({
    queryKey: ['admin', 'quick-search', debounced],
    queryFn: () => adminQuickSearch({ data: { q: debounced } }),
    enabled: debounced.length > 0 && !value,
  })
  if (value) {
    return (
      <div className="space-y-1.5">
        <Label>Worker</Label>
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span>
            <span className="font-medium">{value.name}</span> <span className="text-muted-foreground">u/{value.reddit}</span>
          </span>
          <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => onChange(null)}>
            Change
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor="worker-search">Worker</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id="worker-search" className="pl-8" placeholder="Name, phone, email or Reddit…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {data?.workers.length ? (
        <ul className="max-h-48 overflow-y-auto rounded-md border">
          {data.workers.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                className={cn('flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent')}
                onClick={() => onChange({ id: w.id, name: w.name, reddit: w.reddit })}
              >
                <span>
                  <span className="font-medium">{w.name}</span> <span className="text-muted-foreground">u/{w.reddit}</span>
                </span>
                <Check className="size-3.5 opacity-0" />
              </button>
            </li>
          ))}
        </ul>
      ) : debounced && data ? (
        <p className="text-xs text-muted-foreground">No workers match.</p>
      ) : null}
    </div>
  )
}
