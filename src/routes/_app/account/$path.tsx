import { AccountView } from '@daveyplate/better-auth-ui'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { ADMIN_NAV, WORKER_NAV } from '@/components/layout/nav'
import { SimpleShell } from '@/components/layout/simple-shell'
import { PageHeader } from '@/components/shared/page-header'

const PATHS = ['settings', 'security'] as const

/** Account & security (Better Auth UI), shared by admins and workers. */
export const Route = createFileRoute('/_app/account/$path')({
  head: () => ({ meta: [{ title: 'Account · TinyGig' }] }),
  beforeLoad: ({ params }) => {
    if (!PATHS.includes(params.path as (typeof PATHS)[number])) {
      throw redirect({ to: '/account/$path', params: { path: 'settings' } })
    }
  },
  component: AccountPage,
})

function AccountPage() {
  const { viewer } = Route.useRouteContext()
  const { path } = Route.useParams()
  const content = (
    <div className="space-y-6">
      <PageHeader title="Account" />
      <AccountView
        pathname={`/account/${path}`}
        classNames={{
          base: 'gap-6 md:gap-10',
          sidebar: { base: 'md:w-48', button: 'justify-start', buttonActive: 'bg-accent' },
          cards: 'max-w-2xl',
        }}
      />
    </div>
  )
  if (viewer.user.role === 'admin') {
    return (
      <AppShell viewer={viewer} home="/admin" groups={ADMIN_NAV}>
        {content}
      </AppShell>
    )
  }
  if (viewer.profileStatus === 'approved') {
    return (
      <AppShell viewer={viewer} home="/w" groups={[{ items: WORKER_NAV }]} notificationsHref="/w/notifications">
        {content}
      </AppShell>
    )
  }
  return <SimpleShell email={viewer.user.email}>{content}</SimpleShell>
}
