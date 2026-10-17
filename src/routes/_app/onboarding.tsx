import { createFileRoute, redirect } from '@tanstack/react-router'
import { SimpleShell } from '@/components/layout/simple-shell'
import { ApplicationForm } from '@/features/workers/components/application-form'
import { getOnboardingDefaults } from '@/features/workers/server/application'

export const Route = createFileRoute('/_app/onboarding')({
  head: () => ({ meta: [{ title: 'Apply · TinyGig' }] }),
  beforeLoad: ({ context }) => {
    const { viewer } = context
    if (viewer.user.role === 'admin') throw redirect({ to: '/admin' })
    if (viewer.profileStatus === 'approved') throw redirect({ to: '/w' })
    if (viewer.profileStatus === 'pending' || viewer.profileStatus === 'suspended') throw redirect({ to: '/pending' })
  },
  loader: () => getOnboardingDefaults(),
  component: OnboardingPage,
})

function OnboardingPage() {
  const defaults = Route.useLoaderData()
  const { viewer } = Route.useRouteContext()
  return (
    <SimpleShell email={viewer.user.email}>
      <div className="mb-8 space-y-2">
        <p className="font-mono text-xs tracking-wider text-primary uppercase">Step 1 of 2 · Apply</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Tell us about yourself</h1>
        <p className="max-w-xl text-muted-foreground">
          {defaults.status === 'rejected'
            ? 'Update your details and re-apply. Our team will take another look.'
            : 'Fill this once. After approval you can claim paid gigs right away.'}
        </p>
      </div>
      <ApplicationForm
        defaults={{
          fullName: defaults.fullName,
          email: defaults.email,
          referralCode: defaults.referralCode,
        }}
      />
    </SimpleShell>
  )
}
