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
      <div className="mb-8 space-y-3">
        <ol className="grid max-w-sm grid-cols-2 gap-1.5 text-xs" aria-label="Getting started">
          <li aria-current="step">
            <span aria-hidden className="block h-[3px] rounded-[1px] bg-ink" />
            <span className="mt-1.5 block font-semibold text-ink">1 Apply</span>
          </li>
          <li>
            <span aria-hidden className="block h-[3px] rounded-[1px] bg-border" />
            <span className="mt-1.5 block text-muted-foreground">2 Get approved</span>
          </li>
        </ol>
        <h1 className="font-display text-[1.75rem] leading-tight font-bold sm:text-4xl">Tell us about yourself</h1>
        <p className="max-w-xl text-muted-foreground">
          {defaults.status === 'rejected'
            ? 'Update your details and re-apply. Our team will take another look.'
            : 'Fill this once. After approval you can add more accounts and start raising your hand for paid gigs.'}
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
