import { AccountSettingsCards, SecuritySettingsCards } from '@daveyplate/better-auth-ui'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileForm } from '@/features/workers/components/profile-form'
import { myProfileQuery } from '@/features/workers/queries'

const TABS = ['work', 'account', 'security'] as const

/** One place for everything about "me": work details, login account and security. */
export const Route = createFileRoute('/_app/w/profile')({
  head: () => ({ meta: [{ title: 'Profile · TinyGig' }] }),
  validateSearch: z.object({ tab: z.enum(TABS).optional().catch(undefined) }),
  loader: ({ context }) => context.queryClient.ensureQueryData(myProfileQuery()),
  component: ProfilePage,
})

const cardClass = { card: { base: 'shadow-none' } }

function ProfilePage() {
  const { data: profile } = useSuspenseQuery(myProfileQuery())
  const { tab = 'work' } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Profile" />
      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v === 'work' ? undefined : (v as (typeof TABS)[number]) }, replace: true })}>
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
          <TabsTrigger value="work">Work</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        <TabsContent value="work" className="pt-4">
          <ProfileForm profile={profile} />
        </TabsContent>
        <TabsContent value="account" className="pt-4">
          <AccountSettingsCards classNames={cardClass} />
        </TabsContent>
        <TabsContent value="security" className="pt-4">
          <SecuritySettingsCards classNames={cardClass} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
