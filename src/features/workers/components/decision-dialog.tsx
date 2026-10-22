import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { reviewTemplatesQuery } from '@/features/settings/queries'

type Kind = 'changes' | 'reject' | 'approve' | 'applicant_reject'

/** Comment dialog with one-click canned templates. Used for rejects / change requests. */
export function DecisionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  templateKind,
  required = true,
  destructive,
  pending,
  extra,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  confirmLabel: string
  templateKind: Kind
  required?: boolean
  destructive?: boolean
  pending?: boolean
  extra?: React.ReactNode
  onConfirm: (comment: string) => void
}) {
  const [comment, setComment] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { data: templates } = useQuery({ ...reviewTemplatesQuery(), enabled: open })
  useEffect(() => {
    if (open) setComment('')
  }, [open])
  const list = (templates ?? []).filter((t) => t.kind === templateKind)
  const canSubmit = !required || comment.trim().length > 0
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit && !pending) {
            e.preventDefault()
            onConfirm(comment.trim())
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {list.length ? (
          <div className="flex flex-wrap gap-1.5">
            {list.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setComment((c) => (c ? `${c}\n${t.body}` : t.body))
                  textareaRef.current?.focus()
                }}
                className="rounded-md border bg-muted/50 px-2 py-1 text-xs transition-colors duration-150 hover:border-ink/40 hover:bg-ink/[0.04] focus-visible:outline-2 focus-visible:outline-ring"
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : null}
        {extra}
        <div className="space-y-1.5">
          <Label htmlFor="decision-comment">{required ? 'Comment (shown to the worker)' : 'Note (optional)'}</Label>
          <Textarea
            id="decision-comment"
            ref={textareaRef}
            autoFocus
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Be specific so they can fix it quickly…"
          />
          <p className="text-xs text-muted-foreground">
            {list.length ? 'Tap a saved reply to add it, then edit. ' : ''}⌘/Ctrl + Enter to submit
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={!canSubmit || pending}
            onClick={() => onConfirm(comment.trim())}
          >
            {pending ? <Spinner /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
