import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { WorkerGigDetail } from '@/features/gigs/components/worker-gig-detail'
import { workerGigQuery } from '@/features/gigs/queries'

export const Route = createFileRoute('/_app/w/gigs/$gigId')({
  head: () => ({ meta: [{ title: 'Gig details · TinyGig' }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(workerGigQuery(params.gigId)),
  component: GigDetailPage,
})

function GigDetailPage() {
  const { gigId } = Route.useParams()
  const { data } = useSuspenseQuery(workerGigQuery(gigId))
  return <WorkerGigDetail data={data} />
}
