import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Check, ExternalLink } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { formatDate, RelativeTime } from '@/components/shared/relative-time'
import { Button } from '@/components/ui/button'
import { myWarmupQuery } from '@/features/warmup/queries'
import { setWarmupDone } from '@/features/warmup/server/warmup'
import { useAction } from '@/hooks/use-action'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/w/warmup')({
  head: () => ({ meta: [{ title: 'Warm-up · TinyGig' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(myWarmupQuery()),
  component: WarmupPage,
})

/** Its own tab (R53): unpaid account building, written by the worker (R56), marked done by them (R57). */
function WarmupPage() {
  const { data } = useSuspenseQuery(myWarmupQuery())
  const toggle = useAction((v: { itemId: string; done: boolean }) => setWarmupDone({ data: v }), {
    invalidate: [['w', 'warmup']],
  })
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Warm-up"
        description="Build your accounts’ history before paid work. Write your own posts and comments: warm-up isn’t paid, and we don’t give you content for it."
      />
      {data.warming.length ? (
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b px-4 py-2.5">
            <h2 className="font-display text-base font-bold">Accounts warming up</h2>
          </div>
          <dl className="divide-y">
            {data.warming.map((a) => (
              <div key={a.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                <dt className="min-w-0 truncate text-sm font-semibold">{a.label}</dt>
                <dd className="shrink-0 text-right text-sm">
                  <span className="ledger-label mr-1.5">Paid gigs from</span>
                  <span className="font-semibold tabular">{formatDate(a.paidFrom)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {data.items.length ? (
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
            <h2 className="font-display text-base font-bold">Suggestions</h2>
            <span className="text-xs text-muted-foreground tabular">
              {data.items.filter((it) => it.doneAt).length} of {data.items.length} done
            </span>
          </div>
          <ul className="divide-y">
            {data.items.map((it) => (
              <li key={it.id} className={cn('space-y-2 px-4 py-4', it.doneAt && 'bg-success/[0.04]')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={cn('font-semibold', it.doneAt && 'text-muted-foreground')}>{it.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <RelativeTime date={it.createdAt} />
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={it.doneAt ? 'outline' : 'default'}
                    className={cn('shrink-0', it.doneAt && 'text-success')}
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ itemId: it.id, done: !it.doneAt })}
                    aria-pressed={Boolean(it.doneAt)}
                  >
                    {it.doneAt ? (
                      <>
                        <Check /> Done
                      </>
                    ) : (
                      'Mark done'
                    )}
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{it.instructions}</p>
                {it.links.length ? (
                  <div className="flex flex-wrap gap-2">
                    {it.links.map((l) => (
                      <Button key={l} asChild variant="outline" size="sm" className="h-8 max-w-full">
                        <a href={l} target="_blank" rel="noreferrer">
                          <span className="truncate">{l.replace(/^https?:\/\/(www\.)?reddit\.com\//, '')}</span> <ExternalLink />
                        </a>
                      </Button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <EmptyState
          title="Nothing to warm up right now"
          description="When we suggest communities for a new account to join, they show up here. Until then, post and comment from your own accounts as you normally would."
        />
      )}
    </div>
  )
}
