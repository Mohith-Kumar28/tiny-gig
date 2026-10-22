import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
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
  active: {
    title: 'Nothing to do right now',
    description: 'Tap “I’m interested” on a gig. When you’re selected, the task shows up here with its deadline.',
  },
  in_review: { title: 'Nothing in review', description: 'Tasks you submit wait here while our team checks them.' },
  approved: { title: 'No approved tasks yet', description: 'Approved tasks land here and their pay goes to your balance.' },
  closed: { title: 'No closed tasks', description: 'Rejected, expired and withdrawn tasks show up here.' },
  all: { title: 'No tasks yet', description: 'Find a gig you qualify for and tap “I’m interested” to get started.' },
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
      <Tabs
        value={tab}
        onValueChange={(v) => navigate({ search: { tab: v === 'active' ? undefined : (v as MyWorkTab) }, replace: true })}
      >
        <div className="-mx-4 overflow-x-auto border-b px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <TabsList variant="line" className="h-auto gap-0 p-0">
            {MY_WORK_TABS.map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="h-10 flex-none gap-1 rounded-none px-2 first:pl-0 after:bg-ink data-[state=active]:text-ink group-data-[orientation=horizontal]/tabs:after:bottom-0 dark:data-[state=active]:text-ink"
              >
                {TAB_LABELS[t]}
                {counts && counts[t] > 0 ? (
                  <span className="rounded-md bg-foreground/8 px-1 text-[11px] leading-4 font-semibold tabular">
                    {counts[t]}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {isPending ? (
        <div className="divide-y overflow-hidden rounded-lg border bg-card">
          {Array.from({ length: 4 }, (_, i) => (
            <WorkerTaskRowSkeleton key={i} />
          ))}
        </div>
      ) : rows.length ? (
        <div className="divide-y overflow-hidden rounded-lg border bg-card">
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
