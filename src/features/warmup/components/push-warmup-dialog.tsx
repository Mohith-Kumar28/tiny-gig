import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { WarmupAudience } from '@/db/schema/accounts'
import { type PickedWorker, WorkerPicker } from '@/features/accounts/components/worker-picker'
import { useAction } from '@/hooks/use-action'
import { previewWarmupAudience, saveWarmupItem } from '../server/warmup'

/** Push subreddits to join plus instructions (R54), to individuals or a filtered group (R55). */
export function PushWarmupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [links, setLinks] = useState('')
  const [mode, setMode] = useState<'all' | 'filter' | 'workers'>('filter')
  const [maxKarma, setMaxKarma] = useState('300')
  const [maxAgeDays, setMaxAgeDays] = useState('')
  const [people, setPeople] = useState<PickedWorker[]>([])
  const [picker, setPicker] = useState<PickedWorker | null>(null)
  useEffect(() => {
    if (picker && !people.some((p) => p.id === picker.id)) setPeople((p) => [...p, picker])
    if (picker) setPicker(null)
  }, [picker, people])

  const audience: WarmupAudience =
    mode === 'all'
      ? { type: 'all' }
      : mode === 'workers'
        ? { type: 'workers', workerIds: people.map((p) => p.id) }
        : { type: 'filter', maxKarma: maxKarma === '' ? undefined : Number(maxKarma), maxAgeDays: maxAgeDays === '' ? undefined : Number(maxAgeDays) }
  const valid = mode !== 'workers' || people.length > 0
  const { data: preview } = useQuery({
    queryKey: ['admin', 'warmup', 'preview', audience],
    queryFn: () => previewWarmupAudience({ data: audience }),
    enabled: open && valid,
  })
  const linkList = links
    .split(/\s+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/^https?:\/\//.test(l) ? l : `https://www.reddit.com/${l.replace(/^\/+/, '')}`))
  const push = useAction(() => saveWarmupItem({ data: { title, instructions, links: linkList, audience } }), {
    success: (r) => `Pushed to ${r.sent} worker${r.sent === 1 ? '' : 's'}`,
    invalidate: [['admin', 'warmup']],
    onSuccess: () => {
      onOpenChange(false)
      setTitle('')
      setInstructions('')
      setLinks('')
      setPeople([])
    },
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Push a warm-up task</DialogTitle>
          <DialogDescription>Unpaid. Workers write their own content and mark it done themselves.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wu-title">Title</Label>
            <Input id="wu-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Join these 5 subs and comment for a week" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wu-ins">Instructions</Label>
            <Textarea id="wu-ins" rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Join, read the rules, leave a few genuine comments a day. No links, no promotion." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wu-links">Subreddits or links (space or line separated)</Label>
            <Textarea id="wu-links" rows={2} value={links} onChange={(e) => setLinks(e.target.value)} placeholder="r/india r/bangalore https://www.reddit.com/r/IndianGaming" />
          </div>
          <div className="space-y-2">
            <Label>Who</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ['filter', 'Accounts matching'],
                  ['workers', 'Chosen workers'],
                  ['all', 'Everyone'],
                ] as const
              ).map(([v, label]) => (
                <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm has-[[data-state=checked]]:border-primary/50">
                  <RadioGroupItem value={v} /> {label}
                </label>
              ))}
            </RadioGroup>
            {mode === 'filter' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="wu-karma" className="text-xs text-muted-foreground">
                    Karma under
                  </Label>
                  <Input id="wu-karma" type="number" min={0} value={maxKarma} onChange={(e) => setMaxKarma(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wu-age" className="text-xs text-muted-foreground">
                    Account younger than (days)
                  </Label>
                  <Input id="wu-age" type="number" min={0} value={maxAgeDays} onChange={(e) => setMaxAgeDays(e.target.value)} placeholder="any" />
                </div>
              </div>
            ) : mode === 'workers' ? (
              <div className="space-y-2">
                <WorkerPicker value={picker} onChange={setPicker} />
                <div className="flex flex-wrap gap-1.5">
                  {people.map((p) => (
                    <span key={p.id} className="inline-flex h-6 items-center gap-1 rounded-md bg-secondary pr-1 pl-2 text-xs">
                      {p.name}
                      <button type="button" aria-label={`Remove ${p.name}`} onClick={() => setPeople((x) => x.filter((y) => y.id !== p.id))}>
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {valid && preview ? <p className="text-xs text-muted-foreground">Goes to {preview.count} approved worker{preview.count === 1 ? '' : 's'}.</p> : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || title.trim().length < 3 || instructions.trim().length < 3 || push.isPending} onClick={() => push.mutate(undefined)}>
            {push.isPending ? <Spinner /> : null}Push
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
