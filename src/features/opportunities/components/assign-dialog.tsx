import { AlertTriangle, Ban } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PostDialogShell, PostHint } from '@/features/reddit-post/components/post-dialog'
import { RedditComposer } from '@/features/reddit-post/components/reddit-composer'
import { emptyPost, isPostTouched, missingPiece, type RedditPost } from '@/features/reddit-post/post'
import { useAction } from '@/hooks/use-action'
import { selectAccount } from '../server/selection'

export type AssignTarget = {
  accountId: string
  label: string
  workerName: string
  hard: { rule: string; message: string }[]
  soft: { rule: string; message: string }[]
}

/**
 * Confirms a pick and, in the same step, says exactly what to post. Risky picks are flagged, not
 * silently blocked (R10): staff can override a cooldown with a written reason, recorded on the
 * assignment. The post is optional here and can be added later from the Assigned list.
 */
export function AssignDialog({
  gigId,
  gigTitle,
  community,
  target,
  direct,
  onOpenChange,
  onDone,
}: {
  gigId: string
  gigTitle: string
  community?: string | null
  target: AssignTarget | null
  direct?: boolean
  onOpenChange: (o: boolean) => void
  onDone?: () => void
}) {
  const [reason, setReason] = useState('')
  const [post, setPost] = useState<RedditPost>(() => emptyPost(community))
  useEffect(() => {
    if (!target) return
    setReason('')
    setPost(emptyPost(community))
  }, [target, community])
  const touched = isPostTouched(post)
  const assign = useAction(
    () =>
      selectAccount({
        data: {
          gigId,
          accountId: target?.accountId ?? '',
          overrideReason: reason || undefined,
          direct,
          post: touched ? post : undefined,
        },
      }),
    {
      success: () => `${target?.label} selected. The worker has been notified.`,
      invalidate: [['admin']],
      onSuccess: () => {
        onOpenChange(false)
        onDone?.()
      },
    },
  )
  const risky = (target?.soft.length ?? 0) > 0
  const blocked = (target?.hard.length ?? 0) > 0
  const missing = touched ? missingPiece(post) : null
  const close = () => onOpenChange(false)
  return (
    <PostDialogShell
      open={!!target}
      onOpenChange={onOpenChange}
      title={`Assign ${target?.label ?? ''} to “${gigTitle}”`}
      description="Their rate is fixed now. Add what they should post below."
    >
      <div className="space-y-3 border-b border-[var(--rd-border-weak)] px-6 pt-5 pb-4 max-sm:px-4">
        <div>
          <p className="text-base font-bold">
            Assign {target?.label} to “{gigTitle}”
          </p>
          <p className="text-sm text-[var(--rd-muted)]">
            {target?.workerName} gets a notification and email with the deadline. Their rate is fixed now and won’t change later.
          </p>
        </div>
        {blocked ? (
          <div className="space-y-1.5 rounded-2xl border border-[var(--rd-danger)]/40 p-3 text-sm">
            {target?.hard.map((b) => (
              <p key={b.rule} className="flex gap-2 text-[var(--rd-danger)]">
                <Ban className="mt-0.5 size-3.5 shrink-0" /> {b.message}
              </p>
            ))}
            <p className="text-xs text-[var(--rd-muted)]">These can’t be overridden.</p>
          </div>
        ) : risky ? (
          <div className="space-y-2 rounded-2xl border border-warning/50 bg-warning/10 p-3 text-sm">
            <p className="font-semibold">This pick breaks a cooldown:</p>
            {target?.soft.map((b) => (
              <p key={b.rule} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" /> {b.message}
              </p>
            ))}
            <textarea
              aria-label="Why override? (recorded)"
              rows={2}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why override? (recorded) e.g. Client asked for this account"
              className="block w-full resize-y rounded-2xl border border-[var(--rd-border)] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--rd-placeholder)] focus:border-[var(--rd-fg)]"
            />
          </div>
        ) : null}
      </div>
      <RedditComposer
        heading="What they should post"
        value={post}
        onChange={setPost}
        onClose={close}
        secondary={{ label: 'Cancel', onClick: close }}
        primary={{
          label: risky ? 'Override and assign' : 'Assign',
          onClick: () => assign.mutate(undefined),
          disabled: blocked || !!missing || (risky && reason.trim().length < 3),
          pending: assign.isPending,
        }}
      />
      {missing ? (
        <PostHint tone="danger">{missing}</PostHint>
      ) : !touched ? (
        <PostHint>Leave the post empty to assign now and add it later from Assigned.</PostHint>
      ) : null}
    </PostDialogShell>
  )
}
