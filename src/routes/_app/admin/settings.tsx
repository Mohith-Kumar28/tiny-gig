import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { ClientsManager } from '@/features/clients/components/clients-manager'
import { clientsQuery } from '@/features/clients/queries'
import { AdminTeam } from '@/features/settings/components/admin-team'
import { ReviewTemplatesManager } from '@/features/settings/components/review-templates-manager'
import { SettingsForm } from '@/features/settings/components/settings-form'
import { adminsQuery, reviewTemplatesQuery, settingsQuery } from '@/features/settings/queries'

export const Route = createFileRoute('/_app/admin/settings')({
  head: () => ({ meta: [{ title: 'Settings · TinyGig Admin' }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(settingsQuery()),
      context.queryClient.ensureQueryData(reviewTemplatesQuery()),
      context.queryClient.ensureQueryData(adminsQuery()),
      context.queryClient.ensureQueryData(clientsQuery()),
    ])
  },
  component: SettingsPage,
})

function SettingsPage() {
  const { data: settings } = useSuspenseQuery(settingsQuery())
  return (
    <div className="max-w-5xl space-y-8">
      <PageHeader
        title="Settings"
        description="How TinyGig runs: alerts, cooldowns, pay by level, clients, and who can use this console."
      />
      <SettingsForm initial={settings} />
      <ClientsManager />
      <AdminTeam />
      <ReviewTemplatesManager />
    </div>
  )
}
