import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Send, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Toggle } from '@/components/ui/toggle'
import { INDIAN_STATES } from '@/db/schema/enums'
import { type PickedWorker, WorkerPicker } from '@/features/accounts/components/worker-picker'
import { LEVEL_LABELS, LEVELS, type Level } from '@/features/accounts/rules'
import { useAction } from '@/hooks/use-action'
import { cn } from '@/lib/utils'
import { type BroadcastAudience, describeBroadcastAudience } from '../audience'
import { plainText, type RichDoc } from '../rich-text'
import { previewBroadcastAudience, sendBroadcast } from '../server/broadcasts'
import { EMPTY_DOC, RichTextEditor } from './rich-text-editor'

type Mode = BroadcastAudience['type']

function StatesPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (s: string) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s])
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          <span className={cn('truncate', !value.length && 'text-muted-foreground')}>
            {value.length ? (value.length > 2 ? `${value.length} states` : value.join(', ')) : 'Any state'}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        <Command>
          <CommandInput placeholder="Search states…" />
          <CommandList className="max-h-64">
            <CommandEmpty>No state found.</CommandEmpty>
            <CommandGroup>
              {INDIAN_STATES.map((s) => (
                <CommandItem key={s} value={s} onSelect={() => toggle(s)}>
                  <Check className={cn('size-4', value.includes(s) ? 'opacity-100' : 'opacity-0')} />
                  {s}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function ChannelRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange?: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-4 rounded-md border bg-background/60 p-3">
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  )
}

/** Write once, deliver to the bell, email and phones of the workers the audience selects. */
export function BroadcastComposer() {
  const [subject, setSubject] = useState('')
  const [doc, setDoc] = useState<RichDoc>(EMPTY_DOC)
  const [editorKey, setEditorKey] = useState(0)
  const [mode, setMode] = useState<Mode>('all')
  const [levels, setLevels] = useState<Level[]>([])
  const [states, setStates] = useState<string[]>([])
  const [people, setPeople] = useState<PickedWorker[]>([])
  const [picker, setPicker] = useState<PickedWorker | null>(null)
  const [email, setEmail] = useState(true)
  const [push, setPush] = useState(true)
  const [pinned, setPinned] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (picker && !people.some((p) => p.id === picker.id)) setPeople((p) => [...p, picker])
    if (picker) setPicker(null)
  }, [picker, people])

  const audience: BroadcastAudience =
    mode === 'all'
      ? { type: 'all' }
      : mode === 'workers'
        ? { type: 'workers', workerIds: people.map((p) => p.id) }
        : { type: 'filter', levels, states }
  const audienceValid = mode !== 'workers' || people.length > 0
  const { data: preview, isFetching } = useQuery({
    queryKey: ['admin', 'broadcasts', 'preview', audience],
    queryFn: () => previewBroadcastAudience({ data: audience }),
    enabled: audienceValid,
  })
  const count = audienceValid ? (preview?.count ?? 0) : 0
  const ready = subject.trim().length > 0 && plainText(doc).length > 0 && audienceValid && count > 0

  const send = useAction(
    () => sendBroadcast({ data: { subject: subject.trim(), doc, audience, channels: { email, push }, pinned } }),
    {
      success: (r) => `Sent to ${r.sent} worker${r.sent === 1 ? '' : 's'}`,
      invalidate: [['admin', 'broadcasts']],
      onSuccess: () => {
        setConfirming(false)
        setSubject('')
        setDoc(EMPTY_DOC)
        setEditorKey((k) => k + 1)
        setPinned(false)
      },
    },
  )

  const channels = ['notifications', email && 'email', push && 'push'].filter(Boolean).join(', ')

  return (
    <section className="space-y-5 rounded-lg border bg-card p-4 sm:p-5">
      <div className="space-y-1.5">
        <Label htmlFor="bc-subject">Subject</Label>
        <Input
          id="bc-subject"
          value={subject}
          maxLength={140}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="New WhatsApp group for L2 workers"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bc-body">Message</Label>
        <RichTextEditor key={editorKey} id="bc-body" value={doc} onChange={setDoc} />
      </div>

      <div className="space-y-2">
        <Label>Send to</Label>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ['all', 'All approved workers'],
              ['filter', 'Filter by level or state'],
              ['workers', 'Chosen workers'],
            ] as const
          ).map(([v, label]) => (
            <label
              key={v}
              htmlFor={`bc-mode-${v}`}
              className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm transition-colors duration-150 hover:bg-accent/50 has-[[data-state=checked]]:border-ink/50 has-[[data-state=checked]]:bg-ink/[0.04]"
            >
              <RadioGroupItem id={`bc-mode-${v}`} value={v} /> {label}
            </label>
          ))}
        </RadioGroup>
        {mode === 'filter' ? (
          <div className="grid gap-3 rounded-md border bg-background/60 p-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Level (none picked means any)</span>
              <div className="flex flex-wrap gap-1.5">
                {LEVELS.map((l) => (
                  <Toggle
                    key={l}
                    size="sm"
                    variant="outline"
                    pressed={levels.includes(l)}
                    onPressedChange={(on) => setLevels((x) => (on ? [...x, l] : x.filter((y) => y !== l)))}
                    className="data-[state=on]:border-ink/50 data-[state=on]:bg-ink/[0.06]"
                  >
                    {LEVEL_LABELS[l]}
                    {preview?.byLevel[l] != null && levels.includes(l) ? (
                      <span className="text-muted-foreground tabular">{preview.byLevel[l]}</span>
                    ) : null}
                  </Toggle>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">State</span>
              <StatesPicker value={states} onChange={setStates} />
            </div>
          </div>
        ) : mode === 'workers' ? (
          <div className="space-y-2">
            <WorkerPicker value={picker} onChange={setPicker} />
            <div className="flex flex-wrap gap-1.5">
              {people.map((p) => (
                <span key={p.id} className="inline-flex h-6 items-center gap-1 rounded-md bg-secondary pr-1 pl-2 text-xs">
                  {p.name}
                  <button
                    type="button"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => setPeople((x) => x.filter((y) => y.id !== p.id))}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          {isFetching ? <Spinner className="size-3" /> : null}
          {audienceValid ? `Goes to ${count} approved worker${count === 1 ? '' : 's'}.` : 'Pick at least one worker.'}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ChannelRow
          id="bc-inapp"
          label="Notifications page"
          description="Always on. Shows in their feed and as a pop-up next time they open TinyGig."
          checked
          disabled
        />
        <ChannelRow
          id="bc-pin"
          label="Pin to the top"
          description="Stays above everything else on their Notifications page until you unpin it."
          checked={pinned}
          onChange={setPinned}
        />
        <ChannelRow
          id="bc-email"
          label="Email"
          description="The full formatted message, to each worker’s email."
          checked={email}
          onChange={setEmail}
        />
        <ChannelRow
          id="bc-push"
          label="Push"
          description="Phone and desktop alert on devices with alerts turned on."
          checked={push}
          onChange={setPush}
        />
      </div>

      <div className="flex justify-end">
        <Button disabled={!ready || send.isPending} onClick={() => setConfirming(true)}>
          <Send /> Send to {count} worker{count === 1 ? '' : 's'}
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send “{subject.trim()}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {describeBroadcastAudience(audience)}: {count} worker{count === 1 ? '' : 's'}, by {channels}
              {pinned ? ', pinned to the top' : ''}. Emails and pushes can’t be recalled once sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={send.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={send.isPending}
              onClick={(e) => {
                e.preventDefault()
                send.mutate(undefined)
              }}
            >
              {send.isPending ? <Spinner /> : <Send />} Send now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
