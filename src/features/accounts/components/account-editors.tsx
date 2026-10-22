import { Check, Pencil } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { formatDate } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ACCOUNT_STANDINGS, type AccountStanding } from '@/db/schema/enums'
import { useAction } from '@/hooks/use-action'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { istDayKey } from '../rules'
import { updateAccount } from '../server/roster'

export const STANDING_LABELS: Record<AccountStanding, string> = {
  active: 'Active',
  warned: 'Warned',
  banned: 'Banned',
  lost: 'Lost',
  retired: 'Retired',
}

function useUpdateAccount(success: string) {
  return useAction((v: Parameters<typeof updateAccount>[0]['data']) => updateAccount({ data: v }), {
    success,
    invalidate: [
      ['admin', 'accounts'],
      ['admin', 'worker'],
    ],
  })
}

/** Stops the row click from opening the history sheet. */
function Stop({ children }: { children: ReactNode }) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: wrapper only swallows the row click
    <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="inline-flex">
      {children}
    </div>
  )
}

/** One-click standing change, straight from the table (R6). */
export function StandingSelect({ id, value, className }: { id: string; value: AccountStanding; className?: string }) {
  const update = useUpdateAccount('Standing updated')
  return (
    <Stop>
      <Select
        value={value}
        onValueChange={(v) => update.mutate({ id, standing: v as AccountStanding })}
        disabled={update.isPending}
      >
        <SelectTrigger
          size="sm"
          className={cn('h-7 w-auto gap-1 border-transparent bg-transparent px-1 text-xs hover:border-input hover:bg-card', className)}
          aria-label="Standing"
        >
          <SelectValue>
            <StatusBadge status={value} />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ACCOUNT_STANDINGS.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              <StatusBadge status={s} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Stop>
  )
}

function EditPopover({
  trigger,
  title,
  children,
  open,
  onOpenChange,
}: {
  trigger: ReactNode
  title: string
  children: ReactNode
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  return (
    <Stop>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-2 p-3">
          <div className="text-xs font-medium text-foreground">{title}</div>
          {children}
        </PopoverContent>
      </Popover>
    </Stop>
  )
}

/** Karma with its own age next to it; greyed once stale (R5). Click to re-enter. */
export function KarmaEditor({
  id,
  karma,
  updatedAt,
  stale,
}: {
  id: string
  karma: number | null
  updatedAt: Date | null
  stale: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const update = useUpdateAccount('Karma updated')
  const submit = () => {
    const n = Number(draft)
    if (!Number.isFinite(n) || n < 0 || draft === '') return
    update.mutate({ id, karma: Math.round(n) }, { onSuccess: () => setOpen(false) })
  }
  return (
    <EditPopover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setDraft(karma == null ? '' : String(karma))
      }}
      title="Current karma (today's date is recorded)"
      trigger={
        <button
          type="button"
          title={stale ? 'Karma figure is stale: check the profile and re-enter it' : 'Edit karma'}
          className="group -my-1 -mr-1.5 inline-flex flex-col items-end rounded-md px-1.5 py-1 text-right transition-colors duration-150 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className={cn('inline-flex items-center gap-1 font-semibold tabular', stale && 'font-normal text-muted-foreground/70')}>
            <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            {karma == null ? '—' : formatNumber(karma)}
          </span>
          <span className={cn('text-[11px] text-muted-foreground tabular', stale && 'text-muted-foreground/70')}>
            {updatedAt ? `${stale ? 'stale · ' : ''}${formatDate(updatedAt)}` : 'never checked'}
          </span>
        </button>
      }
    >
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Input
          autoFocus
          type="number"
          inputMode="numeric"
          min={0}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-8 tabular"
        />
        <Button type="submit" size="sm" className="h-8" disabled={update.isPending}>
          <Check />
        </Button>
      </form>
    </EditPopover>
  )
}

/** ms epoch of IST midnight for a yyyy-mm-dd input. */
export function istDateInputToMs(v: string) {
  return Date.parse(`${v}T00:00:00+05:30`)
}

/** Creation date — controls level and so money; admin confirms it by eye (R27). */
export function CreatedOnEditor({
  id,
  createdOn,
  confirmed,
  children,
}: {
  id: string
  createdOn: Date | null
  confirmed: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const update = useUpdateAccount('Creation date saved')
  return (
    <EditPopover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setDraft(createdOn ? istDayKey(createdOn) : '')
      }}
      title="Account created on (check the profile's cake day)"
      trigger={
        <button
          type="button"
          title="Edit creation date"
          className="group -my-1 -ml-1 inline-flex items-center gap-1 rounded-md px-1 py-1 text-left transition-colors duration-150 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          {children}
          <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      }
    >
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft) return
          update.mutate({ id, createdOn: istDateInputToMs(draft) }, { onSuccess: () => setOpen(false) })
        }}
      >
        <div className="flex gap-2">
          <Input
            autoFocus
            type="date"
            max={istDayKey(new Date())}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8"
          />
          <Button type="submit" size="sm" className="h-8" disabled={update.isPending || !draft}>
            <Check />
          </Button>
        </div>
        {!confirmed && createdOn ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-full text-xs"
            disabled={update.isPending}
            onClick={() => update.mutate({ id, confirmCreatedOn: true }, { onSuccess: () => setOpen(false) })}
          >
            Looks right: confirm {formatDate(createdOn)}
          </Button>
        ) : null}
        <p className="text-[11px] text-muted-foreground">Changing it never changes the rate of work already assigned.</p>
      </form>
    </EditPopover>
  )
}
