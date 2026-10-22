import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ClipboardCheck } from 'lucide-react'
import { z } from 'zod'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkerTaskRow, WorkerTaskRowSkeleton } from '@/features/submissions/components/worker-task-row'
import { myWorkCountsQuery, myWorkQuery } from '@/features/submissions/queries'
import { MY_WORK_TABS, type MyWorkTab } from '@/features/submissions/server/worker-submissions'

const TAB_LABELS: Record<MyWorkTab, string> = {
  active: 'To do',
  in_review: 'In review',
  approved: 'Approved',
  closed: 'Closed',
  all: 'All',
}

const EMPTY: Record<MyWorkTab, { title: string; description: string }> = {
  active: { title: 'Nothing to do right now', description: 'When you’re selected for a gig it shows up here with its deadline.' },
  in_review: { title: 'Nothing in review', description: 'Tasks you submit wait here while our team checks them.' },
  approved: { title: 'No approved tasks yet', description: 'Approved tasks and their earnings will show up here.' },
  closed: { title: 'No closed tasks', description: 'Rejected, expired and withdrawn tasks show up here.' },
  all: { title: 'No tasks yet', description: 'Find a gig you like and claim it to get started.' },
}

const searchSchema = z.object({ tab: z.enum(MY_WORK_TABS).optional().catch(undefined) })

export const Route = createFileRoute('/_app/w/work/')({
  head: () => ({ meta: [{ title: 'My work · TinyGig' }] }),
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ tab: search.tab ?? 'active' }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(myWorkQuery(deps.tab)),
      context.queryClient.ensureQueryData(myWorkCountsQuery()),
    ]),
  component: MyWorkPage,
})

function MyWorkPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const tab = search.tab ?? 'active'
  const { data, isPending } = useQuery({ ...myWorkQuery(tab), placeholderData: keepPreviousData })
  const { data: counts } = useQuery(myWorkCountsQuery())
  const rows = data ?? []

  return (
    <div className="space-y-5">
      <PageHeader title="My work" />
      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v === 'active' ? undefined : (v as MyWorkTab) }, replace: true })}>
        <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <TabsList>
            {MY_WORK_TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="gap-1.5 px-3">
                {TAB_LABELS[t]}
                {counts && counts[t] > 0 ? (
                  <span className="rounded-full bg-foreground/8 px-1.5 text-[11px] leading-4 tabular">{counts[t]}</span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {isPending ? (
        <div className="divide-y rounded-xl border bg-card">
          {Array.from({ length: 4 }, (_, i) => (
            <WorkerTaskRowSkeleton key={i} />
          ))}
        </div>
      ) : rows.length ? (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {rows.map((r) => (
            <WorkerTaskRow
              key={r.id}
              task={{
                id: r.id,
                status: r.status,
                payoutAmount: r.payoutAmount,
                dueAt: r.dueAt,
                submittedAt: r.submittedAt,
                liveCheckAt: r.liveCheckAt,
                decidedAt: r.decidedAt,
                payoutId: r.payoutId,
                title: r.gigTitle,
                platform: r.platform,
                community: r.community,
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title={EMPTY[tab].title}
          description={EMPTY[tab].description}
          action={
            tab === 'active' || tab === 'all' ? (
              <Button asChild>
                <Link to="/w/gigs">Find gigs</Link>
              </Button>
            ) : null
          }
        />
      )}
    </div>
  )
}
