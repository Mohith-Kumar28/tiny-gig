import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useAction } from '@/hooks/use-action'
import { updateAdminNote } from '../server/admin-workers'

/** Private note only admins see. Saves on blur (and ⌘/Ctrl+Enter). */
export function WorkerAdminNote({ userId, initial }: { userId: string; initial: string | null }) {
  const [value, setValue] = useState(initial ?? '')
  const saved = useRef(initial ?? '')
  const [justSaved, setJustSaved] = useState(false)
  useEffect(() => {
    setValue(initial ?? '')
    saved.current = initial ?? ''
  }, [initial])

  const save = useAction((note: string) => updateAdminNote({ data: { userId, note } }), {
    invalidate: [['admin', 'worker', userId]],
    onSuccess: (_r, note) => {
      saved.current = note
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    },
  })
  const commit = () => {
    const note = value.trim()
    if (note !== saved.current.trim()) save.mutate(note)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor="admin-note">Private admin note</Label>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {save.isPending ? (
            <>
              <Spinner className="size-3" /> Saving…
            </>
          ) : justSaved ? (
            <>
              <Check className="size-3 text-success" /> Saved
            </>
          ) : (
            'Only admins see this'
          )}
        </span>
      </div>
      <Textarea
        id="admin-note"
        rows={4}
        value={value}
        maxLength={4000}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') commit()
        }}
        placeholder="e.g. Fast and reliable on r/india posts. Check screenshots carefully."
      />
    </div>
  )
}
