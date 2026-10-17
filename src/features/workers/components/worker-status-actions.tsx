import { Ban, Check, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { WorkerStatus } from '@/db/schema/enums'
import { useAction } from '@/hooks/use-action'
import { decideApplicants, setWorkerStatus } from '../server/admin-workers'
import { DecisionDialog } from './decision-dialog'

type Action = 'approve' | 'suspend' | 'reactivate'

const COPY: Record<Action, { title: string; description: string; confirm: string; success: string }> = {
  approve: {
    title: 'Approve worker?',
    description: 'They get an approval email and can start claiming gigs right away.',
    confirm: 'Approve',
    success: 'Approved: worker notified by email',
  },
  suspend: {
    title: 'Suspend worker?',
    description: "They can't claim new gigs while suspended. Approved earnings stay payable.",
    confirm: 'Suspend',
    success: 'Worker suspended',
  },
  reactivate: {
    title: 'Reactivate worker?',
    description: 'They can claim gigs again.',
    confirm: 'Reactivate',
    success: 'Worker reactivated',
  },
}

/** Header quick actions for a worker; each confirms with a reason dialog. */
export function WorkerStatusActions({ userId, name, status }: { userId: string; name: string; status: WorkerStatus }) {
  const [action, setAction] = useState<Action | null>(null)
  const run = useAction(
    async (v: { action: Action; note?: string }) => {
      if (v.action === 'approve') return decideApplicants({ data: { userIds: [userId], decision: 'approve', note: v.note } })
      return setWorkerStatus({
        data: { userId, status: v.action === 'suspend' ? 'suspended' : 'approved', note: v.note },
      })
    },
    {
      success: (_r, v) => COPY[v.action].success,
      invalidate: [['admin']],
      onSuccess: () => setAction(null),
    },
  )
  const copy = action ? COPY[action] : null

  return (
    <>
      {status === 'pending' || status === 'rejected' || status === 'draft' ? (
        <Button size="sm" onClick={() => setAction('approve')}>
          <Check /> Approve
        </Button>
      ) : null}
      {status === 'suspended' ? (
        <Button size="sm" variant="outline" onClick={() => setAction('reactivate')}>
          <RotateCcw /> Reactivate
        </Button>
      ) : null}
      {status === 'approved' ? (
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setAction('suspend')}>
          <Ban /> Suspend
        </Button>
      ) : null}
      <DecisionDialog
        open={!!action}
        onOpenChange={(o) => !o && setAction(null)}
        title={copy ? copy.title.replace('worker', name) : ''}
        description={copy?.description}
        confirmLabel={copy?.confirm ?? 'Confirm'}
        templateKind="applicant_reject"
        required={action === 'suspend'}
        destructive={action === 'suspend'}
        pending={run.isPending}
        onConfirm={(note) => action && run.mutate({ action, note: note || undefined })}
      />
    </>
  )
}
