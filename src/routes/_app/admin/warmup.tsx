import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Archive, ExternalLink, Plus, Sprout } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { RelativeTime } from '@/components/shared/relative-time'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { PushWarmupDialog } from '@/features/warmup/components/push-warmup-dialog'
import { warmupItemsQuery } from '@/features/warmup/queries'
import { describeAudience } from '@/features/warmup/rules'
import { archiveWarmupItem } from '@/features/warmup/server/warmup'
import { useAction } from '@/hooks/use-action'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/admin/warmup')({
  head: () => ({ meta: [{ title: 'Warm-up · TinyGig Admin' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(warmupItemsQuery()),
  component: WarmupAdminPage,
})

/** §11: push account-building tasks and see who says they've done them (self-reported, not gated). */
function WarmupAdminPage() {
  const { data } = useSuspenseQuery(warmupItemsQuery())
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const archive = useAction((id: string) => archiveWarmupItem({ data: { id } }), { success: 'Archived', invalidate: [['admin', 'warmup']] })
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Warm-up"
        description="Subreddits to join and how to behave there, so new accounts build karma and history before paid work. Unpaid."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus /> Push warm-up
          </Button>
        }
      />
      {data.length ? (
        <ul className="space-y-3">
          {data.map((it) => (
            <li key={it.id} className={cn('rounded-xl border bg-card p-4', it.archivedAt && 'opacity-60')}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium">{it.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {describeAudience(it.audience)} · pushed <RelativeTime date={it.createdAt} />
                    {it.archivedAt ? ' · archived' : ''}
                  </p>
                </div>
                <div className="w-40 space-y-1 text-right">
                  <p className="text-xs text-muted-foreground tabular">
                    {it.doneCount} of {it.audienceSize} done
                  </p>
                  <Progress value={it.audienceSize ? (it.doneCount / it.audienceSize) * 100 : 0} className="h-1.5" />
                </div>
                {!it.archivedAt ? (
                  <Button variant="ghost" size="icon" className="size-8" aria-label="Archive" onClick={() => archive.mutate(it.id)}>
                    <Archive />
                  </Button>
                ) : null}
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{it.instructions}</p>
              {it.links.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {it.links.map((l) => (
                    <a key={l} href={l} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      {l.replace(/^https?:\/\/(www\.)?reddit\.com\//, '')} <ExternalLink className="size-3" />
                    </a>
                  ))}
                </div>
              ) : null}
              <button type="button" className="mt-3 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => setExpanded(expanded === it.id ? null : it.id)}>
                {expanded === it.id ? 'Hide people' : 'Show people'}
              </button>
              {expanded === it.id ? (
                <ul className="mt-2 divide-y rounded-lg border text-sm">
                  {it.people.map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-3 py-1.5">
                      <Link to="/admin/workers/$userId" params={{ userId: p.id }} className="hover:underline">
                        {p.name}
                      </Link>
                      {p.doneAt ? (
                        <span className="text-xs text-success">
                          Done <RelativeTime date={p.doneAt} />
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not yet</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Sprout}
          title="No warm-up tasks yet"
          description="Push subreddits to join to new or low-karma accounts."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus /> Push warm-up
            </Button>
          }
        />
      )}
      <PushWarmupDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
