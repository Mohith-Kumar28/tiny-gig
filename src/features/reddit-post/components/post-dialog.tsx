import { type ReactNode, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useAction } from '@/hooks/use-action'
import { cn } from '@/lib/utils'
import { emptyPost, isPostTouched, missingPiece, type RedditPost } from '../post'
import { savePostContent } from '../server/post-content'
import { RedditComposer } from './reddit-composer'

/** Full screen on phones, like Reddit's app; a wide sheet on desktop. */
export function PostDialogShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: string
  children: ReactNode
  className?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        className={cn(
          'reddit-ui gap-0 overflow-y-auto border-[var(--rd-border-weak)] p-0 sm:max-w-3xl sm:rounded-2xl',
          'max-h-[92dvh] max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0',
          className,
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function PostHint({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'danger' }) {
  return (
    <p
      className={cn(
        'px-6 pb-4 text-right text-xs max-sm:px-4 max-sm:text-left',
        tone === 'danger' ? 'text-[var(--rd-danger)]' : 'text-[var(--rd-muted)]',
      )}
    >
      {children}
    </p>
  )
}

/** View or change what an assigned worker should post. Saving pings them while they still have to post. */
export function PostContentDialog({
  target,
  onOpenChange,
}: {
  target: { submissionId: string; post: RedditPost | null; community: string | null; label: string } | null
  onOpenChange: (o: boolean) => void
}) {
  const [post, setPost] = useState<RedditPost>(() => emptyPost())
  useEffect(() => {
    if (target) setPost(target.post ?? emptyPost(target.community))
  }, [target])
  const save = useAction(() => savePostContent({ data: { submissionId: target?.submissionId ?? '', post } }), {
    success: 'Post saved. The worker sees it on their task.',
    invalidate: [['admin']],
    onSuccess: () => onOpenChange(false),
  })
  const missing = isPostTouched(post) ? missingPiece(post) : 'Add the post before saving.'
  const close = () => onOpenChange(false)
  return (
    <PostDialogShell
      open={!!target}
      onOpenChange={onOpenChange}
      title={`Post for ${target?.label ?? 'this assignment'}`}
      description="What the worker should post on Reddit, exactly as it should look."
    >
      <RedditComposer
        heading={`Post for ${target?.label ?? ''}`}
        value={post}
        onChange={setPost}
        onClose={close}
        secondary={{ label: 'Cancel', onClick: close }}
        primary={{ label: 'Save post', onClick: () => save.mutate(undefined), disabled: !!missing, pending: save.isPending }}
      />
      {missing ? <PostHint>{missing}</PostHint> : null}
    </PostDialogShell>
  )
}
