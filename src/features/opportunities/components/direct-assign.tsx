import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { searchAssignable } from '../server/selection'
import type { AssignTarget } from './assign-dialog'

/** Assign straight from the register when nobody suitable raised a hand (R11). A normal button, not a failure path. */
export function DirectAssignDialog({
  gigId,
  open,
  onOpenChange,
  onPick,
}: {
  gigId: string
  open: boolean
  onOpenChange: (o: boolean) => void
  onPick: (t: AssignTarget) => void
}) {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200)
    return () => clearTimeout(t)
  }, [q])
  const { data, isFetching } = useQuery({
    queryKey: ['admin', 'assignable', gigId, debounced],
    queryFn: () => searchAssignable({ data: { gigId, q: debounced } }),
    enabled: open,
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign directly</DialogTitle>
          <DialogDescription>Pick any account from the register. Best fit first, with the same cooldown checks.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus className="pl-8" placeholder="Handle, name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ul className={cn('max-h-[50vh] divide-y overflow-y-auto rounded-lg border', isFetching && 'opacity-70')}>
          {(data ?? []).map((c) => (
            <li key={c.accountId} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {c.label} <span className="font-normal text-muted-foreground">· {c.workerName}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">{c.reason}</p>
                {[...c.hard, ...c.soft].length ? (
                  <p className={cn('truncate text-xs', c.hard.length ? 'text-destructive' : 'text-warning-foreground dark:text-warning')}>
                    {[...c.hard, ...c.soft].map((b) => b.message).join(' · ')}
                  </p>
                ) : null}
              </div>
              <Button
                size="sm"
                variant={c.ok ? 'default' : 'outline'}
                disabled={c.hard.length > 0}
                onClick={() => onPick({ accountId: c.accountId, label: c.label, workerName: c.workerName, hard: c.hard, soft: c.soft })}
              >
                Assign
              </Button>
            </li>
          ))}
          {data && !data.length ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matching accounts.</li> : null}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
