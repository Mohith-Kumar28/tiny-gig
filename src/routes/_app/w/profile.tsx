import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileForm } from '@/features/workers/components/profile-form'
import { myProfileQuery } from '@/features/workers/queries'

export const Route = createFileRoute('/_app/w/profile')({
  head: () => ({ meta: [{ title: 'Profile · TinyGig' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(myProfileQuery()),
  component: ProfilePage,
})

function ProfilePage() {
  const { data: profile } = useSuspenseQuery(myProfileQuery())
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Profile" />
      <ProfileForm profile={profile} />
    </div>
  )
}
