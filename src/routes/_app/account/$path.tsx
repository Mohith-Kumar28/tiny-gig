import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { ADMIN_NAV } from '@/components/layout/nav'
import { SimpleShell } from '@/components/layout/simple-shell'
import { PageHeader } from '@/components/shared/page-header'
import { NotificationSections, ProfileSections, SecuritySections } from '@/features/account/components/account-sections'

const PATHS = ['settings', 'security'] as const

/** Account & security (Better Auth UI), shared by admins and workers. */
export const Route = createFileRoute('/_app/account/$path')({
  head: () => ({ meta: [{ title: 'Account · TinyGig' }] }),
  beforeLoad: ({ params, context }) => {
    const { viewer } = context
    if (viewer.user.role === 'worker' && viewer.profileStatus === 'approved') {
      throw redirect({ to: '/w/profile', search: { tab: params.path === 'security' ? 'security' : 'account' } })
    }
    if (!PATHS.includes(params.path as (typeof PATHS)[number])) {
      throw redirect({ to: '/account/$path', params: { path: 'settings' } })
    }
  },
  component: AccountPage,
})

function AccountPage() {
  const { viewer } = Route.useRouteContext()
  const isAdmin = viewer.user.role === 'admin'
  // One page for both paths: Better Auth UI links to /account/security after some flows.
  const content = (
    <div className="max-w-5xl space-y-8">
      <PageHeader title="Account" description="Your profile, alerts on this device, and how you sign in." />
      <ProfileSections />
      {isAdmin ? <NotificationSections audience="admin" /> : null}
      <SecuritySections email={viewer.user.email} />
    </div>
  )
  if (viewer.user.role === 'admin') {
    return (
      <AppShell viewer={viewer} home="/admin" groups={ADMIN_NAV}>
        {content}
      </AppShell>
    )
  }
  return <SimpleShell email={viewer.user.email}>{content}</SimpleShell>
}
