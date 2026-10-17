import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Ban, CircleCheck, Hourglass, XCircle } from 'lucide-react'
import { SimpleShell } from '@/components/layout/simple-shell'
import { Button } from '@/components/ui/button'

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

const STEPS = ['Application submitted', 'Profile review by our team', 'Access to gigs & payouts']

function PendingPage() {
  const { viewer } = Route.useRouteContext()
  const status = viewer.profileStatus
  return (
    <SimpleShell email={viewer.user.email}>
      <div className="mx-auto max-w-lg py-8 text-center">
        {status === 'pending' ? (
          <>
            <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Hourglass className="size-6" />
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Your application is under review</h1>
            <p className="mt-3 text-muted-foreground">
              Thanks, {viewer.user.name.split(' ')[0]}! A real person checks every profile. We'll email you at{' '}
              <span className="font-medium text-foreground">{viewer.user.email}</span> as soon as there's a decision, usually within
              24–48 hours.
            </p>
            <ol className="mx-auto mt-8 max-w-xs space-y-3 text-left text-sm">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-3">
                  {i === 0 ? (
                    <CircleCheck className="size-5 text-success" />
                  ) : (
                    <span
                      className={`flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold ${i === 1 ? 'border-primary text-primary' : 'text-muted-foreground'}`}
                    >
                      {i + 1}
                    </span>
                  )}
                  <span className={i === 2 ? 'text-muted-foreground' : ''}>{s}</span>
                </li>
              ))}
            </ol>
          </>
        ) : status === 'rejected' ? (
          <>
            <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <XCircle className="size-6" />
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Application not approved</h1>
            <p className="mt-3 text-muted-foreground">We couldn't approve your application this time.</p>
            {viewer.reviewNote ? (
              <blockquote className="mt-5 rounded-xl border bg-card p-4 text-left text-sm">{viewer.reviewNote}</blockquote>
            ) : null}
            <Button asChild className="mt-6">
              <Link to="/onboarding">Update & re-apply</Link>
            </Button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <Ban className="size-6" />
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Account suspended</h1>
            <p className="mt-3 text-muted-foreground">Your access is paused. Reach out to hello@tinygig.in if you think this is a mistake.</p>
            {viewer.reviewNote ? (
              <blockquote className="mt-5 rounded-xl border bg-card p-4 text-left text-sm">{viewer.reviewNote}</blockquote>
            ) : null}
          </>
        )}
      </div>
    </SimpleShell>
  )
}
