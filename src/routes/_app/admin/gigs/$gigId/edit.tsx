import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { GigForm, gigToFormInput } from '@/features/gigs/components/gig-form'
import { gigAdminQuery } from '@/features/gigs/queries'

export const Route = createFileRoute('/_app/admin/gigs/$gigId/edit')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(gigAdminQuery(params.gigId)),
  head: ({ loaderData }) => ({ meta: [{ title: `Edit ${loaderData?.gig.title ?? 'gig'} · TinyGig Admin` }] }),
  component: EditGigPage,
})

function EditGigPage() {
  const { gigId } = Route.useParams()
  const { data } = useSuspenseQuery(gigAdminQuery(gigId))
  const g = data.gig
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 text-muted-foreground">
          <Link to="/admin/gigs/$gigId" params={{ gigId }}>
            <ArrowLeft /> Back to gig
          </Link>
        </Button>
        <PageHeader
          title={
            <span className="inline-flex flex-wrap items-center gap-2">
              Edit gig <StatusBadge status={g.status} />
            </span>
          }
          description={g.title}
        />
      </div>
      <GigForm
        key={`${g.id}-${new Date(g.updatedAt).getTime()}`}
        gigId={g.id}
        initial={gigToFormInput(g)}
        publishedAt={g.publishedAt}
        claimedSlots={g.claimedSlots}
      />
    </div>
  )
}
