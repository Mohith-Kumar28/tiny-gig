import { ArrowDown, ArrowUp, Check, ChevronsUpDown, Plus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { INDIAN_STATES } from '@/db/schema/enums'
import { cn } from '@/lib/utils'

type State = (typeof INDIAN_STATES)[number]

/** Multi-select of Indian states. Empty selection means "all of India". */
export function StatesMultiSelect({ value, onChange, id }: { value: State[]; onChange: (v: State[]) => void; id?: string }) {
  const selected = new Set(value)
  const toggle = (s: State) => {
    const next = new Set(selected)
    if (next.has(s)) next.delete(s)
    else next.add(s)
    onChange(INDIAN_STATES.filter((x) => next.has(x)))
  }
  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" className="w-full justify-between font-normal">
            <span className={cn('truncate', !value.length && 'text-muted-foreground')}>
              {value.length ? `${value.length} state${value.length === 1 ? '' : 's'} selected` : 'All of India'}
            </span>
            <ChevronsUpDown className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search states…" />
            <CommandList className="max-h-72">
              <CommandEmpty>No state found.</CommandEmpty>
              <CommandGroup>
                {INDIAN_STATES.map((s) => {
                  const on = selected.has(s)
                  return (
                    <CommandItem key={s} value={s} onSelect={() => toggle(s)}>
                      <div
                        className={cn(
                          'flex size-4 items-center justify-center rounded-[4px] border',
                          on ? 'border-primary bg-primary text-primary-foreground' : 'border-input [&_svg]:invisible',
                        )}
                      >
                        <Check className="size-3.5 text-primary-foreground" />
                      </div>
                      {s}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              {value.length ? (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem onSelect={() => onChange([])} className="justify-center">
                      Clear (allow all of India)
                    </CommandItem>
                  </CommandGroup>
                </>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length ? (
        <div className="flex flex-wrap gap-1">
          {value.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 pr-1 font-normal">
              {s}
              <button type="button" onClick={() => toggle(s)} className="rounded-sm opacity-60 hover:opacity-100" aria-label={`Remove ${s}`}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** Editable ordered list of short strings (reviewer checklist). */
export function ChecklistEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const set = (i: number, v: string) => onChange(value.map((x, j) => (j === i ? v : x)))
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= value.length) return
    const next = [...value]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    onChange(next)
  }
  const add = () => {
    const v = draft.trim()
    if (!v || value.length >= 20) return
    onChange([...value, v])
    setDraft('')
  }
  return (
    <div className="space-y-1.5">
      {value.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: order is the identity here
        <div key={i} className="group flex items-center gap-1.5">
          <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular">{i + 1}.</span>
          <Input
            ref={(el) => {
              inputs.current[i] = el
            }}
            value={item}
            maxLength={200}
            onChange={(e) => set(i, e.target.value)}
            onBlur={() => !item.trim() && remove(i)}
            onKeyDown={(e) => {
              if (e.altKey && e.key === 'ArrowUp') {
                e.preventDefault()
                move(i, -1)
              } else if (e.altKey && e.key === 'ArrowDown') {
                e.preventDefault()
                move(i, 1)
              }
            }}
            className="h-8"
          />
          <div className="flex shrink-0">
            <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => move(i, 1)}
              disabled={i === value.length - 1}
              aria-label="Move down"
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => remove(i)} aria-label="Remove">
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span className="w-5 shrink-0" />
        <Input
          value={draft}
          maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={value.length >= 20 ? 'Maximum 20 items' : 'Add a check, press Enter…'}
          disabled={value.length >= 20}
          className="h-8"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={!draft.trim()}>
          <Plus /> Add
        </Button>
      </div>
    </div>
  )
}
