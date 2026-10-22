import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Check, ExternalLink, X } from 'lucide-react'
import { useState } from 'react'
import { CopyButton } from '@/components/shared/copy-button'
import { formatDate, formatDateTime, RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { accountAgeDays, formatAge } from '@/features/accounts/rules'
import { useAction } from '@/hooks/use-action'
import { formatNumber } from '@/lib/format'
import { workerDetailQuery } from '../queries'
import { decideApplicants } from '../server/admin-workers'
import { DecisionDialog } from './decision-dialog'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-3 py-2.5 text-sm">
      <dt className="ledger-label">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

export function ApplicantSheet({
  userId,
  onOpenChange,
  onDecided,
}: {
  userId: string | null
  onOpenChange: (open: boolean) => void
  onDecided?: () => void
}) {
  const { data, isLoading } = useQuery({ ...workerDetailQuery(userId ?? ''), enabled: !!userId })
  const [rejecting, setRejecting] = useState(false)
  const decide = useAction(
    (v: { decision: 'approve' | 'reject'; note?: string }) => decideApplicants({ data: { userIds: [userId!], ...v } }),
    {
      success: (_r, v) => (v.decision === 'approve' ? 'Approved: worker notified by email' : 'Rejected: worker notified'),
      invalidate: [['admin']],
      onSuccess: () => {
        setRejecting(false)
        onDecided?.()
      },
    },
  )
  const p = data?.profile
  return (
    <Sheet open={!!userId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="font-display text-xl">{p?.fullName ?? 'Applicant'}</SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            {p ? <StatusBadge status={p.status} /> : null}
            {p ? <span>Applied <RelativeTime date={p.appliedAt} /></span> : null}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading || !p ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
          ) : (
            <>
              {data?.referredBy?.referral.flagged ? (
                <div className="mb-3 flex gap-2 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground dark:text-warning" />
                  <span>
                    <span className="font-medium">Flagged referral.</span> {data.referredBy.referral.flagReason}
                  </span>
                </div>
              ) : null}
              <a
                href={p.redditUrl}
                target="_blank"
                rel="noreferrer"
                className="mb-1 flex items-center justify-between rounded-md border bg-card px-3 py-2.5 text-sm transition-colors duration-150 hover:border-ink/40 hover:bg-ink/[0.04] focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="flex items-baseline gap-2">
                  <span className="ledger-label">Reddit</span> <span className="font-medium">u/{p.redditUsername}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-ink">
                  Check profile <ExternalLink className="size-3.5" />
                </span>
              </a>
              <dl className="divide-y">
                <Row label="Karma">
                  <span className="font-display font-bold tabular">{formatNumber(p.karma)}</span>
                </Row>
                <Row label="Created on">
                  {(() => {
                    const a = data?.accounts.find((x) => x.platform === 'reddit')
                    if (!a?.createdOn) return <span className="text-muted-foreground">—</span>
                    return (
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="tabular">{formatDate(a.createdOn)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatAge(accountAgeDays(a.createdOn))} · {a.createdOnConfirmedAt ? 'confirmed' : 'check the cake day: approving confirms it'}
                        </span>
                      </span>
                    )
                  })()}
                </Row>
                <Row label="Email">
                  <span className="flex items-center gap-1">
                    <span className="truncate">{p.email}</span> <CopyButton value={p.email} />
                  </span>
                </Row>
                <Row label="Phone">
                  <span className="flex items-center gap-1">
                    <span className="tabular">{p.phone}</span> <CopyButton value={p.phone} />
                  </span>
                </Row>
                <Row label="State">{p.state}</Row>
                <Row label="UPI ID">
                  <span className="flex items-center gap-1">
                    <span className="truncate font-mono text-xs">{p.upiId}</span> <CopyButton value={p.upiId} />
                  </span>
                </Row>
                <Row label="Referred by">
                  {data?.referredBy ? (
                    <Link to="/admin/workers/$userId" params={{ userId: data.referredBy.referral.referrerId }} className="underline-offset-4 hover:underline">
                      {data.referredBy.referrerName}
                    </Link>
                  ) : p.referralCodeUsed ? (
                    <span className="text-muted-foreground">Code {p.referralCodeUsed} (no match)</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Row>
                <Row label="Applied">{formatDateTime(p.appliedAt)}</Row>
                {p.reviewNote ? <Row label="Review note">{p.reviewNote}</Row> : null}
              </dl>
              <Button asChild variant="link" className="mt-2 px-0 text-ink">
                <Link to="/admin/workers/$userId" params={{ userId: p.userId }}>
                  Open full profile
                </Link>
              </Button>
            </>
          )}
        </div>
        {p && p.status !== 'approved' ? (
          <SheetFooter className="gap-2.5 border-t">
            <p className="text-xs text-muted-foreground">
              Approve emails them and confirms the Reddit creation date. Reject asks you for a reason to send them.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejecting(true)} disabled={decide.isPending}>
                <X /> Reject
              </Button>
              <Button className="flex-1" onClick={() => decide.mutate({ decision: 'approve' })} disabled={decide.isPending}>
                {decide.isPending ? <Spinner /> : <Check />} Approve
              </Button>
            </div>
          </SheetFooter>
        ) : null}
        <DecisionDialog
          open={rejecting}
          onOpenChange={setRejecting}
          title={`Reject ${p?.fullName ?? 'applicant'}?`}
          description="They'll get an email with your reason and can re-apply later."
          confirmLabel="Reject applicant"
          templateKind="applicant_reject"
          destructive
          pending={decide.isPending}
          onConfirm={(note) => decide.mutate({ decision: 'reject', note })}
        />
      </SheetContent>
    </Sheet>
  )
}
