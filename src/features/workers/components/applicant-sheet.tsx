import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Check, ExternalLink, X } from 'lucide-react'
import { useState } from 'react'
import { CopyButton } from '@/components/shared/copy-button'
import { formatDateTime, RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useAction } from '@/hooks/use-action'
import { formatNumber } from '@/lib/format'
import { workerDetailQuery } from '../queries'
import { decideApplicants } from '../server/admin-workers'
import { DecisionDialog } from './decision-dialog'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
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
                <div className="mb-3 flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                  <AlertTriangle className="size-4 shrink-0 text-warning-foreground dark:text-warning" />
                  <span>{data.referredBy.referral.flagReason}</span>
                </div>
              ) : null}
              <a
                href={p.redditUrl}
                target="_blank"
                rel="noreferrer"
                className="mb-3 flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2.5 text-sm hover:bg-accent"
              >
                <span>
                  <span className="text-muted-foreground">Reddit</span> <span className="font-medium">u/{p.redditUsername}</span>
                </span>
                <ExternalLink className="size-4" />
              </a>
              <dl className="divide-y">
                <Row label="Karma">
                  <span className="tabular font-medium">{formatNumber(p.karma)}</span>
                </Row>
                <Row label="Account age">
                  <span className="tabular">{p.accountAgeMonths} months</span>
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
              <Button asChild variant="link" className="mt-2 px-0">
                <Link to="/admin/workers/$userId" params={{ userId: p.userId }}>
                  Open full profile →
                </Link>
              </Button>
            </>
          )}
        </div>
        {p && p.status !== 'approved' ? (
          <SheetFooter className="flex-row border-t">
            <Button variant="outline" className="flex-1" onClick={() => setRejecting(true)} disabled={decide.isPending}>
              <X /> Reject
            </Button>
            <Button className="flex-1" onClick={() => decide.mutate({ decision: 'approve' })} disabled={decide.isPending}>
              <Check /> Approve
            </Button>
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
