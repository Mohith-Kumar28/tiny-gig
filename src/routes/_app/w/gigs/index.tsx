import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { SearchX } from 'lucide-react'
import { useCallback } from 'react'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { WorkerGigCard, WorkerGigCardSkeleton } from '@/features/gigs/components/worker-gig-card'
import { WorkerGigFilters } from '@/features/gigs/components/worker-gig-filters'
import { availableGigsQuery } from '@/features/gigs/queries'
import { type AvailableGigsSearch, availableGigsSearchSchema } from '@/features/gigs/server/worker-gigs'
import { pluralize } from '@/lib/format'

export const Route = createFileRoute('/_app/w/gigs/')({
  head: () => ({ meta: [{ title: 'Find gigs · TinyGig' }] }),
  validateSearch: availableGigsSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(availableGigsQuery(deps)),
  component: FindGigsPage,
})

function FindGigsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data, isFetching, isPending } = useQuery({ ...availableGigsQuery(search), placeholderData: keepPreviousData })
  const onChange = useCallback(
    (patch: Partial<AvailableGigsSearch>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true }),
    [navigate],
  )
  const gigs = data ?? []
  const open = gigs.filter((g) => !g.ineligible).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Find gigs"
        description="Pick a gig, claim a slot, then post and submit your link before the deadline."
      />
      <WorkerGigFilters search={search} onChange={onChange} />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {isPending ? 'Loading gigs…' : `${pluralize(gigs.length, 'gig')} found${gigs.length !== open ? ` · ${open} you can claim` : ''}`}
        {isFetching && !isPending ? ' · updating…' : ''}
      </p>
      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <WorkerGigCardSkeleton key={i} />
          ))}
        </div>
      ) : gigs.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {gigs.map((g) => (
            <WorkerGigCard key={g.id} gig={g} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No gigs match right now"
          description="New gigs are posted often. Try clearing filters, or check back later. We'll email you when new gigs go live."
          action={
            <Button variant="outline" onClick={() => navigate({ search: {} })}>
              Clear filters
            </Button>
          }
        />
      )}
    </div>
  )
}
