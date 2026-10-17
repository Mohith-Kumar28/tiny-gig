import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { GigForm } from '@/features/gigs/components/gig-form'
import { settingsQuery } from '@/features/settings/queries'

export const Route = createFileRoute('/_app/admin/gigs/new')({
  head: () => ({ meta: [{ title: 'New gig · TinyGig Admin' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery()),
  component: NewGigPage,
})

function NewGigPage() {
  const { data: settings } = useSuspenseQuery(settingsQuery())
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 text-muted-foreground">
          <Link to="/admin/gigs">
            <ArrowLeft /> Gigs
          </Link>
        </Button>
        <PageHeader title="New gig" />
      </div>
      <GigForm
        initial={{ claimWindowHours: settings.defaultClaimWindowHours, liveHoldHours: settings.defaultLiveHoldHours }}
      />
    </div>
  )
}
