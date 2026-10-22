import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PLATFORM_LABELS, PlatformIcon } from '@/components/shared/platform-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { PLATFORMS, type Platform, TASK_TYPES, type TaskType } from '@/db/schema/enums'
import { cn } from '@/lib/utils'
import type { AvailableGigsSearch } from '../server/worker-gigs'
import { TASK_TYPE_LABELS } from './worker-gig-meta'

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'pay', label: 'Highest pay' },
  { value: 'ending', label: 'Ending soon' },
] as const

function toggle<T>(list: T[] | undefined, value: T) {
  const next = list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value]
  return next.length ? next : undefined
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        active ? 'border-ink bg-ink/8 text-ink' : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

export function WorkerGigFilters({
  search,
  onChange,
}: {
  search: AvailableGigsSearch
  onChange: (patch: Partial<AvailableGigsSearch>) => void
}) {
  const [q, setQ] = useState(search.q ?? '')
  useEffect(() => setQ(search.q ?? ''), [search.q])
  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim() || undefined
      if (next !== search.q) onChange({ q: next })
    }, 350)
    return () => clearTimeout(t)
  }, [q, search.q, onChange])

  const hasFilters = Boolean(search.platform?.length || search.taskType?.length || search.q || search.eligibleOnly)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search gigs"
            className="h-10 pl-9"
            aria-label="Search gigs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={search.sort ?? 'newest'} onValueChange={(v) => onChange({ sort: v === 'newest' ? undefined : (v as AvailableGigsSearch['sort']) })}>
            <SelectTrigger className="h-10 flex-1 sm:w-40" aria-label="Sort gigs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-normal">
            <Switch checked={Boolean(search.eligibleOnly)} onCheckedChange={(c) => onChange({ eligibleOnly: c || undefined })} />
            <span className="hidden sm:inline">Only gigs I qualify for</span>
            <span className="sm:hidden">I qualify</span>
          </Label>
        </div>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {PLATFORMS.filter((p) => p !== 'other').map((p: Platform) => (
          <Chip key={p} active={Boolean(search.platform?.includes(p))} onClick={() => onChange({ platform: toggle(search.platform, p) })}>
            <PlatformIcon platform={p} className="size-3.5" />
            {PLATFORM_LABELS[p]}
          </Chip>
        ))}
        <span aria-hidden className="mx-1 w-px shrink-0 self-stretch bg-border" />
        {TASK_TYPES.filter((t) => t !== 'other').map((t: TaskType) => (
          <Chip key={t} active={Boolean(search.taskType?.includes(t))} onClick={() => onChange({ taskType: toggle(search.taskType, t) })}>
            {TASK_TYPE_LABELS[t]}
          </Chip>
        ))}
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 rounded-md"
            onClick={() => {
              setQ('')
              onChange({ platform: undefined, taskType: undefined, q: undefined, eligibleOnly: undefined })
            }}
          >
            <X /> Clear
          </Button>
        ) : null}
      </div>
    </div>
  )
}
