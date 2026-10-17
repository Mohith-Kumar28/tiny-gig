import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Briefcase, Plus, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PlatformIcon } from '@/components/shared/platform-icon'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { adminQuickSearch } from '@/features/analytics/server/admin-shell'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { ADMIN_NAV } from './nav'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const navigate = useNavigate()

  useHotkeys({ 'mod+k': () => setOpen((o) => !o), '/': () => setOpen(true) })
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200)
    return () => clearTimeout(t)
  }, [q])

  const { data } = useQuery({
    queryKey: ['admin', 'quick-search', debounced],
    queryFn: () => adminQuickSearch({ data: { q: debounced } }),
    enabled: open && debounced.length > 1,
  })

  const go = (to: string) => {
    setOpen(false)
    setQ('')
    navigate({ to })
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Jump to" description="Search pages, workers and gigs">
      <CommandInput placeholder="Search workers, gigs or pages…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {data?.workers.length ? (
          <CommandGroup heading="Workers">
            {data.workers.map((w) => (
              <CommandItem key={w.id} value={`worker-${w.id}-${w.name}-${w.reddit}`} onSelect={() => go(`/admin/workers/${w.id}`)}>
                <UserRound />
                <span className="truncate">{w.name}</span>
                <span className="text-xs text-muted-foreground">u/{w.reddit}</span>
                <StatusBadge status={w.status} className="ml-auto" />
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {data?.gigs.length ? (
          <CommandGroup heading="Gigs">
            {data.gigs.map((g) => (
              <CommandItem key={g.id} value={`gig-${g.id}-${g.title}`} onSelect={() => go(`/admin/gigs/${g.id}`)}>
                <PlatformIcon platform={g.platform} />
                <span className="truncate">{g.title}</span>
                <StatusBadge status={g.status} className="ml-auto" />
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go('/admin/gigs/new')}>
            <Plus /> Create gig
          </CommandItem>
          <CommandItem onSelect={() => go('/admin/review')}>
            <Briefcase /> Start reviewing
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Pages">
          {ADMIN_NAV.flatMap((g) => g.items).map((item) => (
            <CommandItem key={item.to} onSelect={() => go(item.to)}>
              <item.icon /> {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
