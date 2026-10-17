import { useQuery } from '@tanstack/react-query'
import { MessageSquareText, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useAction } from '@/hooks/use-action'
import { reviewTemplatesQuery } from '../queries'
import { deleteReviewTemplate, saveReviewTemplate } from '../server/settings'

type Kind = 'changes' | 'reject' | 'approve' | 'applicant_reject'
type Template = { id?: string; label: string; body: string; kind: Kind }

const KINDS: { kind: Kind; title: string; description: string }[] = [
  { kind: 'changes', title: 'Request changes', description: 'Worker can fix and resubmit.' },
  { kind: 'reject', title: 'Reject submission', description: 'Final: the worker is not paid.' },
  { kind: 'approve', title: 'Approve', description: 'Optional thank-you or feedback.' },
  { kind: 'applicant_reject', title: 'Reject applicant / suspend', description: 'Sent when declining a worker.' },
]

const STARTERS: Template[] = [
  { kind: 'changes', label: 'Wrong subreddit', body: 'This was posted in the wrong community. Please post it in the subreddit listed in the brief and resubmit the new link.' },
  { kind: 'changes', label: 'Post not public / link broken', body: "We couldn't open your link, or the post isn't public. Please check the link works in a private window and resubmit." },
  { kind: 'changes', label: "Doesn't follow brief", body: "The content doesn't match the brief. Please re-read the brief and guidelines, edit your post, and resubmit." },
  { kind: 'changes', label: 'Missing screenshot', body: 'Please add a screenshot showing the live post (with your username visible) and resubmit.' },
  { kind: 'reject', label: 'Post removed by moderators', body: 'Your post was removed by the moderators before the live check finished, so we can’t approve it.' },
  { kind: 'reject', label: 'Duplicate / low-effort content', body: 'This submission is a duplicate or too low-effort to approve. Please write original, thoughtful content for future gigs.' },
  { kind: 'reject', label: 'Deadline missed', body: 'The changes were not submitted before the deadline, so this task has been closed.' },
  { kind: 'approve', label: 'Great work', body: 'Great work, thanks! Your payment will be included in the next payout.' },
  { kind: 'applicant_reject', label: 'Reddit account too new', body: 'Your Reddit account is too new for our gigs right now. Please re-apply once it’s a few months older.' },
  { kind: 'applicant_reject', label: 'Low karma', body: 'Your Reddit karma is below what our gigs need. Keep participating on Reddit and re-apply later.' },
  { kind: 'applicant_reject', label: 'Profile link invalid', body: "We couldn't open your Reddit profile link. Please re-apply with the correct link (reddit.com/user/yourname)." },
]

function TemplateDialog({ value, onOpenChange }: { value: Template | null; onOpenChange: (o: boolean) => void }) {
  const [draft, setDraft] = useState<Template>({ label: '', body: '', kind: 'changes' })
  useEffect(() => {
    if (value) setDraft(value)
  }, [value])
  const save = useAction((t: Template) => saveReviewTemplate({ data: t }), {
    success: (_r, t) => (t.id ? 'Template updated' : 'Template added'),
    invalidate: [['admin', 'review-templates']],
    onSuccess: () => onOpenChange(false),
  })
  const valid = draft.label.trim() && draft.body.trim()
  const submit = () => valid && save.mutate({ ...draft, label: draft.label.trim(), body: draft.body.trim() })
  return (
    <Dialog open={!!value} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{value?.id ? 'Edit template' : 'New template'}</DialogTitle>
          <DialogDescription>Shown as a one-click chip in review and applicant dialogs.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-label">Label</Label>
              <Input id="tpl-label" autoFocus maxLength={60} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Wrong subreddit" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-kind">Used for</Label>
              <Select value={draft.kind} onValueChange={(k) => setDraft({ ...draft, kind: k as Kind })}>
                <SelectTrigger id="tpl-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.kind} value={k.kind}>
                      {k.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-body">Message (shown to the worker)</Label>
            <Textarea
              id="tpl-body"
              rows={5}
              maxLength={1000}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
              }}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || save.isPending}>
            {save.isPending ? <Spinner /> : null}
            Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ReviewTemplatesManager() {
  const { data: templates, isLoading } = useQuery(reviewTemplatesQuery())
  const [editing, setEditing] = useState<Template | null>(null)

  const remove = useAction((id: string) => deleteReviewTemplate({ data: { id } }), {
    success: 'Template deleted',
    invalidate: [['admin', 'review-templates']],
  })
  const seed = useAction(
    async () => {
      for (const t of STARTERS) await saveReviewTemplate({ data: t })
      return STARTERS.length
    },
    { success: (n) => `${n} starter templates added`, invalidate: [['admin', 'review-templates']] },
  )

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold">Review templates</h2>
          <p className="text-sm text-muted-foreground">Canned messages for faster, consistent reviews.</p>
        </div>
        <Button size="sm" onClick={() => setEditing({ label: '', body: '', kind: 'changes' })}>
          <Plus /> New template
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !templates?.length ? (
        <EmptyState
          icon={MessageSquareText}
          title="No templates yet"
          description="Start with a set of common reasons for changes, rejections and applicant decisions. You can edit them after."
          action={
            <Button onClick={() => seed.mutate(undefined)} disabled={seed.isPending}>
              {seed.isPending ? <Spinner /> : <Sparkles />}
              Load starter templates
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {KINDS.map((k) => {
            const list = templates.filter((t) => t.kind === k.kind)
            return (
              <div key={k.kind} className="rounded-xl border bg-card">
                <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {k.title} <span className="font-normal text-muted-foreground tabular">· {list.length}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">{k.description}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditing({ label: '', body: '', kind: k.kind })} aria-label={`Add ${k.title} template`}>
                    <Plus />
                  </Button>
                </div>
                {list.length ? (
                  <ul className="divide-y">
                    {list.map((t) => (
                      <li key={t.id} className="group flex items-start gap-2 px-4 py-2.5">
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(t)}>
                          <div className="text-sm font-medium">{t.label}</div>
                          <div className="line-clamp-2 text-xs text-muted-foreground">{t.body}</div>
                        </button>
                        <div className="flex shrink-0 opacity-60 group-hover:opacity-100">
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditing(t)} aria-label="Edit">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 hover:text-destructive"
                            disabled={remove.isPending}
                            onClick={() => remove.mutate(t.id)}
                            aria-label="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-4 text-sm text-muted-foreground">None yet.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
      <TemplateDialog value={editing} onOpenChange={(o) => !o && setEditing(null)} />
    </section>
  )
}
