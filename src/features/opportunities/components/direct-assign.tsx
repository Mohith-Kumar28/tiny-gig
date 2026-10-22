import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Ban, Search } from 'lucide-react'
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
          <DialogDescription>
            Pick any account from the register. Best fit first, with the same cooldown checks.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            className="pl-8"
            placeholder="Handle, name or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ul className={cn('max-h-[50vh] divide-y overflow-y-auto rounded-lg border', isFetching && 'opacity-70')}>
          {(data ?? []).map((c) => {
            const blocked = c.hard.length > 0
            const risky = !blocked && c.soft.length > 0
            return (
              <li key={c.accountId} className={cn('relative flex items-start gap-3 px-3 py-2.5', blocked && 'bg-muted/40')}>
                {blocked || risky ? (
                  <span
                    aria-hidden
                    className={cn('absolute inset-y-0 left-0 w-[3px]', blocked ? 'bg-destructive/50' : 'bg-warning')}
                  />
                ) : null}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className={cn('truncate text-sm font-medium', blocked && 'text-muted-foreground')}>
                    {c.label} <span className="font-normal text-muted-foreground">· {c.workerName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{c.reason}</p>
                  {c.hard.length || c.soft.length ? (
                    <ul className="space-y-0.5 pt-0.5 text-xs">
                      {c.hard.map((b) => (
                        <li key={b.rule} className="flex gap-1.5 font-medium text-destructive">
                          <Ban className="mt-px size-3.5 shrink-0" /> {b.message}
                        </li>
                      ))}
                      {c.soft.map((b) => (
                        <li key={b.rule} className="flex gap-1.5 font-medium text-warning-foreground dark:text-warning">
                          <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning" /> {b.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {blocked ? (
                  <Button size="sm" variant="outline" disabled className="min-w-24">
                    <Ban /> Blocked
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={risky ? 'outline' : 'default'}
                    className={cn('min-w-24', risky && 'border-warning/70 hover:bg-warning/10')}
                    onClick={() =>
                      onPick({ accountId: c.accountId, label: c.label, workerName: c.workerName, hard: c.hard, soft: c.soft })
                    }
                  >
                    {risky ? <AlertTriangle className="text-warning" /> : null}
                    {risky ? 'Assign…' : 'Assign'}
                  </Button>
                )}
              </li>
            )
          })}
          {data && !data.length ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matching accounts. Try a handle, a name or a phone number.
            </li>
          ) : null}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
