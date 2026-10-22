import { Check, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { FacetOption } from './types'

export function DataTableFacetedFilter({
  title,
  options,
  value,
  onChange,
  counts,
}: {
  title: string
  options: FacetOption[]
  value: string[] | undefined
  onChange: (next: string[] | undefined) => void
  counts?: Partial<Record<string, number>>
}) {
  const selected = new Set(value ?? [])
  const toggle = (v: string) => {
    const next = new Set(selected)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    onChange(next.size ? [...next] : undefined)
  }
  const chip = 'rounded-md bg-ink/10 px-1 text-xs font-medium text-ink'
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8',
            selected.size > 0
              ? 'border-ink/40 bg-ink/[0.04] text-foreground hover:bg-ink/[0.07]'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <PlusCircle className={cn(selected.size > 0 && 'text-ink')} />
          {title}
          {selected.size > 0 ? (
            <>
              <Separator orientation="vertical" className="mx-0.5 h-4 bg-ink/25" />
              <span className={cn(chip, 'tabular lg:hidden')}>{selected.size}</span>
              <span className="hidden gap-1 lg:flex">
                {selected.size > 2 ? (
                  <span className={cn(chip, 'tabular')}>{selected.size} selected</span>
                ) : (
                  options
                    .filter((o) => selected.has(o.value))
                    .map((o) => (
                      <span key={o.value} className={chip}>
                        {o.label}
                      </span>
                    ))
                )}
              </span>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const isSelected = selected.has(o.value)
                return (
                  <CommandItem key={o.value} onSelect={() => toggle(o.value)}>
                    <div
                      className={cn(
                        'flex size-4 items-center justify-center rounded-md border transition-colors duration-150',
                        isSelected ? 'border-ink bg-ink text-ink-foreground' : 'border-input [&_svg]:invisible',
                      )}
                    >
                      <Check className="size-3.5 text-ink-foreground" />
                    </div>
                    {o.icon ? <o.icon className="size-4 text-muted-foreground" /> : null}
                    <span className="truncate">{o.label}</span>
                    {counts?.[o.value] != null ? (
                      <span className="ml-auto text-xs text-muted-foreground tabular">{counts[o.value]}</span>
                    ) : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selected.size > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange(undefined)} className="justify-center text-center">
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
