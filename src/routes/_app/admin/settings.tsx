import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/page-header'
import { ReviewTemplatesManager } from '@/features/settings/components/review-templates-manager'
import { SettingsForm } from '@/features/settings/components/settings-form'
import { reviewTemplatesQuery, settingsQuery } from '@/features/settings/queries'

export const Route = createFileRoute('/_app/admin/settings')({
  head: () => ({ meta: [{ title: 'Settings · TinyGig Admin' }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(settingsQuery()),
      context.queryClient.ensureQueryData(reviewTemplatesQuery()),
    ])
  },
  component: SettingsPage,
})

function SettingsPage() {
  const { data: settings } = useSuspenseQuery(settingsQuery())
  return (
    <div className="max-w-4xl space-y-10">
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <SettingsForm initial={settings} />
      </div>
      <ReviewTemplatesManager />
    </div>
  )
}
