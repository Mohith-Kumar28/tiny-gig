import { useQuery } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { PlatformIcon } from '@/components/shared/platform-icon'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { openOpportunitiesQuery } from '../queries'
import { previewAssignment } from '../server/selection'
import { type AssignTarget, AssignDialog } from './assign-dialog'

/** From the roster: put this account on an open opportunity, with the same checks as selection (R11). */
export function AssignToOpportunity({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [pick, setPick] = useState<{ gigId: string; title: string; target: AssignTarget } | null>(null)
  const { data } = useQuery({ ...openOpportunitiesQuery(), enabled: open })
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Send /> Assign
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to an opportunity</DialogTitle>
            <DialogDescription>Live gigs with open slots.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border">
            {(data ?? []).map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  disabled={!!loading}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-accent disabled:opacity-60"
                  onClick={async () => {
                    setLoading(g.id)
                    try {
                      const p = await previewAssignment({ data: { gigId: g.id, accountId } })
                      setPick({ gigId: g.id, title: g.title, target: { accountId, label: p.label, workerName: p.workerName, hard: p.hard, soft: p.soft } })
                      setOpen(false)
                    } finally {
                      setLoading(null)
                    }
                  }}
                >
                  <PlatformIcon platform={g.platform} />
                  <span className="min-w-0 flex-1 truncate">{g.title}</span>
                  <span className="text-xs text-muted-foreground tabular">
                    {g.totalSlots - g.claimedSlots} open
                  </span>
                  {loading === g.id ? <Spinner /> : null}
                </button>
              </li>
            ))}
            {data && !data.length ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">No live gigs with open slots.</li> : null}
          </ul>
        </DialogContent>
      </Dialog>
      <AssignDialog gigId={pick?.gigId ?? ''} gigTitle={pick?.title ?? ''} target={pick?.target ?? null} direct onOpenChange={(o) => !o && setPick(null)} />
    </>
  )
}
