import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

/** Small confirm dialog that collects a note (void reason, flag reason…). */
export function NoteDialog({
  open,
  onOpenChange,
  title,
  description,
  label = 'Note',
  placeholder,
  confirmLabel,
  required = true,
  destructive,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  label?: string
  placeholder?: string
  confirmLabel: string
  required?: boolean
  destructive?: boolean
  pending?: boolean
  onConfirm: (note: string) => void
}) {
  const [note, setNote] = useState('')
  useEffect(() => {
    if (open) setNote('')
  }, [open])
  const canSubmit = (!required || note.trim().length > 0) && !pending
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="note-dialog-input">
            {label}
            {required ? null : <span className="font-normal text-muted-foreground"> (optional)</span>}
          </Label>
          <Textarea
            id="note-dialog-input"
            autoFocus
            rows={3}
            maxLength={300}
            value={note}
            placeholder={placeholder}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) onConfirm(note.trim())
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} disabled={!canSubmit} onClick={() => onConfirm(note.trim())}>
            {pending ? <Spinner /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
