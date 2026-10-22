import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Check, ExternalLink, Sprout } from 'lucide-react'
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
  const toggle = useAction((v: { itemId: string; done: boolean }) => setWarmupDone({ data: v }), { invalidate: [['w', 'warmup']] })
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Warm-up"
        description="Build your accounts’ history before paid work. Write your own posts and comments: warm-up isn’t paid, and we don’t give you content for it."
      />
      {data.warming.length ? (
        <section className="space-y-2 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Accounts warming up</h2>
          <ul className="space-y-1.5 text-sm">
            {data.warming.map((a) => (
              <li key={a.id} className="flex justify-between gap-3">
                <span className="font-medium">{a.label}</span>
                <span className="text-muted-foreground">paid gigs from {formatDate(a.paidFrom)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {data.items.length ? (
        <ul className="space-y-3">
          {data.items.map((it) => (
            <li key={it.id} className={cn('space-y-2 rounded-xl border bg-card p-4', it.doneAt && 'border-success/30')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{it.title}</p>
                  <p className="text-xs text-muted-foreground">
                    <RelativeTime date={it.createdAt} />
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={it.doneAt ? 'secondary' : 'default'}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ itemId: it.id, done: !it.doneAt })}
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
                    <Button key={l} asChild variant="outline" size="sm" className="h-7">
                      <a href={l} target="_blank" rel="noreferrer">
                        {l.replace(/^https?:\/\/(www\.)?reddit\.com\//, '')} <ExternalLink />
                      </a>
                    </Button>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Sprout} title="Nothing to warm up right now" description="When we suggest communities to join, they show up here." />
      )}
    </div>
  )
}
