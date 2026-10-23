import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, CircleSlash } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
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
  if (data.unavailable) {
    return (
      <EmptyState
        icon={CircleSlash}
        title={data.unavailable.status === 'paused' ? 'This gig is paused' : 'This gig has closed'}
        description={`“${data.unavailable.title}” isn't taking interest any more. New gigs show up under Find gigs.`}
        action={
          <Button asChild variant="outline">
            <Link to="/w/gigs">
              <ArrowLeft /> Find gigs
            </Link>
          </Button>
        }
        className="mx-auto mt-6 max-w-xl"
      />
    )
  }
  return <WorkerGigDetail data={data} />
}
