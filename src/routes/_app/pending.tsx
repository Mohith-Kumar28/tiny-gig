import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Ban, CircleCheck, Hourglass, XCircle } from 'lucide-react'
import { SimpleShell } from '@/components/layout/simple-shell'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/pending')({
  head: () => ({ meta: [{ title: 'Application status · TinyGig' }] }),
  beforeLoad: ({ context }) => {
    const { viewer } = context
    if (viewer.user.role === 'admin') throw redirect({ to: '/admin' })
    if (viewer.profileStatus === 'approved') throw redirect({ to: '/w' })
    if (viewer.profileStatus === 'none' || viewer.profileStatus === 'draft') throw redirect({ to: '/onboarding' })
  },
  component: PendingPage,
})

const STEPS = [
  { label: 'Application submitted', state: 'done' },
  { label: 'Profile review by our team', state: 'current' },
  { label: 'Access to gigs and payouts', state: 'upcoming' },
] as const

function PendingPage() {
  const { viewer } = Route.useRouteContext()
  const status = viewer.profileStatus
  return (
    <SimpleShell email={viewer.user.email}>
      <div className="mx-auto max-w-lg py-6 sm:py-10">
        {status === 'pending' ? (
          <>
            <h1 className="font-display text-[1.75rem] leading-tight font-bold sm:text-3xl">Your application is under review</h1>
            <p className="mt-3 text-muted-foreground">
              Thanks, {viewer.user.name.split(' ')[0]}! A real person checks every profile. We'll email you at{' '}
              <span className="font-medium text-foreground">{viewer.user.email}</span> as soon as there's a decision, usually
              within 24 to 48 hours.
            </p>
            <ol className="mt-6 divide-y rounded-lg border bg-card" aria-label="Application progress">
              {STEPS.map((s, i) => (
                <li
                  key={s.label}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                  aria-current={s.state === 'current' ? 'step' : undefined}
                >
                  {s.state === 'done' ? (
                    <CircleCheck className="size-4.5 shrink-0 text-success" aria-label="Done" />
                  ) : (
                    <span
                      className={cn(
                        'w-4.5 shrink-0 text-center font-display font-bold tabular',
                        s.state === 'current' ? 'text-ink' : 'text-muted-foreground',
                      )}
                    >
                      {i + 1}
                    </span>
                  )}
                  <span
                    className={cn(
                      'flex-1',
                      s.state === 'current' && 'font-semibold',
                      s.state === 'upcoming' && 'text-muted-foreground',
                    )}
                  >
                    {s.label}
                  </span>
                  {s.state === 'current' ? (
                    <span className="inline-flex items-center gap-1 text-xs text-ink">
                      <Hourglass className="size-3.5" /> In progress
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">Nothing else to do for now. We'll email you either way.</p>
          </>
        ) : status === 'rejected' ? (
          <>
            <h1 className="flex items-center gap-2.5 font-display text-[1.75rem] leading-tight font-bold sm:text-3xl">
              <XCircle className="size-6 shrink-0 text-destructive" /> Application not approved
            </h1>
            <p className="mt-3 text-muted-foreground">
              We couldn't approve your application this time. You can update your details and apply again.
            </p>
            {viewer.reviewNote ? (
              <blockquote className="mt-5 rounded-md border border-destructive/25 bg-destructive/[0.05] px-4 py-3 text-sm whitespace-pre-wrap">
                <span className="ledger-label mb-1 block">Note from our team</span>
                {viewer.reviewNote}
              </blockquote>
            ) : null}
            <Button asChild className="mt-6">
              <Link to="/onboarding">Update & re-apply</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="flex items-center gap-2.5 font-display text-[1.75rem] leading-tight font-bold sm:text-3xl">
              <Ban className="size-6 shrink-0 text-destructive" /> Account suspended
            </h1>
            <p className="mt-3 text-muted-foreground">
              Your access is paused. Reach out to{' '}
              <a href="mailto:hello@tinygig.in" className="font-medium text-ink underline underline-offset-2">
                hello@tinygig.in
              </a>{' '}
              if you think this is a mistake.
            </p>
            {viewer.reviewNote ? (
              <blockquote className="mt-5 rounded-md border border-destructive/25 bg-destructive/[0.05] px-4 py-3 text-sm whitespace-pre-wrap">
                <span className="ledger-label mb-1 block">Note from our team</span>
                {viewer.reviewNote}
              </blockquote>
            ) : null}
          </>
        )}
      </div>
    </SimpleShell>
  )
}
