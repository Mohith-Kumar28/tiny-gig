import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { WorkerOverview } from '@/features/analytics/components/worker-overview'
import { workerOverviewQuery } from '@/features/analytics/queries'
import { myEarningsQuery } from '@/features/payouts/queries'
import { PushPrompt } from '@/features/push/components/push-prompt'

export const Route = createFileRoute('/_app/w/')({
  head: () => ({ meta: [{ title: 'Overview · TinyGig' }] }),
  loader: ({ context }) => {
    // Earnings load in parallel; the page renders skeletons until they arrive.
    void context.queryClient.prefetchQuery(myEarningsQuery())
    return context.queryClient.ensureQueryData(workerOverviewQuery())
  },
  component: OverviewPage,
})

function OverviewPage() {
  const { data: overview } = useSuspenseQuery(workerOverviewQuery())
  const { data: earnings } = useQuery(myEarningsQuery())
  return (
    <div className="space-y-6">
      <PushPrompt />
      <WorkerOverview overview={overview} earnings={earnings} />
    </div>
  )
}
