import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Archive, ChevronRight, ExternalLink, Plus } from 'lucide-react'
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
        <ul className="divide-y rounded-lg border bg-card">
          {data.map((it) => (
            <li key={it.id} className={cn('p-4', it.archivedAt && 'bg-muted/30 text-muted-foreground')}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-display font-bold text-foreground">
                    {it.title}
                    {it.archivedAt ? <span className="ml-2 align-middle font-sans text-xs font-normal text-muted-foreground">Archived</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {describeAudience(it.audience)} · pushed <RelativeTime date={it.createdAt} />
                  </p>
                </div>
                <div className="w-40 space-y-1.5 text-right">
                  <p className="text-xs text-muted-foreground tabular">
                    <span className="font-display text-sm font-bold text-foreground">{it.doneCount}</span> of {it.audienceSize} say done
                  </p>
                  <Progress
                    value={it.audienceSize ? (it.doneCount / it.audienceSize) * 100 : 0}
                    className="h-1 rounded-sm bg-success/15 *:data-[slot=progress-indicator]:bg-success"
                  />
                </div>
                {!it.archivedAt ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    aria-label="Archive"
                    title="Archive: hide it from workers"
                    disabled={archive.isPending}
                    onClick={() => archive.mutate(it.id)}
                  >
                    <Archive />
                  </Button>
                ) : (
                  <span className="size-8" />
                )}
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{it.instructions}</p>
              {it.links.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {it.links.map((l) => (
                    <a key={l} href={l} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs text-ink transition-colors duration-150 hover:border-ink/40 hover:bg-ink/[0.04]">
                      {l.replace(/^https?:\/\/(www\.)?reddit\.com\//, '')} <ExternalLink className="size-3" />
                    </a>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                aria-expanded={expanded === it.id}
                className="mt-3 inline-flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => setExpanded(expanded === it.id ? null : it.id)}
              >
                <ChevronRight className={cn('size-3.5 transition-transform duration-200', expanded === it.id && 'rotate-90')} />
                {expanded === it.id ? 'Hide people' : `Show people (${it.people.length})`}
              </button>
              {expanded === it.id ? (
                <ul className="mt-2 divide-y rounded-md border bg-background text-sm">
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
          title="No warm-up tasks yet"
          description="Push a warm-up to new or low-karma accounts: which subreddits to join and how to behave there. Workers mark it done themselves."
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
