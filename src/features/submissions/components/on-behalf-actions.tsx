import { UserCog } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useAction } from '@/hooks/use-action'
import { adminSubmitInsights, adminSubmitLink } from '../server/admin-review'
import { ScreenshotUploader } from './screenshot-uploader'

/**
 * For when someone was reached directly, outside the system, and posted (R39): staff record the
 * link or insights so the manual process feeds the register instead of bypassing it. Internal only.
 */
export function OnBehalfActions({
  submissionId,
  workerId,
  status,
  accountLabel,
}: {
  submissionId: string
  workerId: string
  status: string
  accountLabel?: string
}) {
  const [open, setOpen] = useState<'link' | 'insights' | null>(null)
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [keys, setKeys] = useState<string[]>([])
  const [karma, setKarma] = useState('')
  const [uploading, setUploading] = useState(false)
  const reset = () => {
    setUrl('')
    setNote('')
    setKeys([])
    setKarma('')
  }
  const link = useAction(() => adminSubmitLink({ data: { submissionId, proofUrl: url.trim(), note: note || undefined } }), {
    success: 'Link recorded on the worker’s behalf',
    invalidate: [['admin']],
    onSuccess: () => {
      setOpen(null)
      reset()
    },
  })
  const insights = useAction(
    () => adminSubmitInsights({ data: { submissionId, insightsKeys: keys, karma: karma === '' ? undefined : Number(karma), note: note || undefined } }),
    {
      success: 'Insights recorded on the worker’s behalf',
      invalidate: [['admin']],
      onSuccess: () => {
        setOpen(null)
        reset()
      },
    },
  )
  const canLink = status === 'claimed' || status === 'changes_requested'
  const canInsights = status === 'on_hold'
  if (!canLink && !canInsights) return null
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(canLink ? 'link' : 'insights')}>
        <UserCog /> {canLink ? 'Submit link for worker' : 'Upload insights for worker'}
      </Button>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{open === 'link' ? 'Submit the link for the worker' : 'Upload insights for the worker'}</DialogTitle>
            <DialogDescription>
              Recorded as added by you on behalf of {accountLabel ?? 'the worker'}. The worker sees it as their own step.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {open === 'link' ? (
              <div className="space-y-1.5">
                <Label htmlFor="obo-url">Post link</Label>
                <Input id="obo-url" inputMode="url" placeholder="https://www.reddit.com/r/…/comments/…" value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
            ) : (
              <>
                <ScreenshotUploader value={keys} onChange={setKeys} onUploadingChange={setUploading} forUser={workerId} />
                <div className="space-y-1.5">
                  <Label htmlFor="obo-karma">Current karma (optional)</Label>
                  <Input id="obo-karma" type="number" min={0} value={karma} onChange={(e) => setKarma(e.target.value)} className="max-w-40" />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="obo-note">How you got it (optional)</Label>
              <Input id="obo-note" placeholder="e.g. sent on WhatsApp" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(null)}>
              Cancel
            </Button>
            {open === 'link' ? (
              <Button disabled={!/^https?:\/\//.test(url.trim()) || link.isPending} onClick={() => link.mutate(undefined)}>
                {link.isPending ? <Spinner /> : null}Record link
              </Button>
            ) : (
              <Button disabled={!keys.length || uploading || insights.isPending} onClick={() => insights.mutate(undefined)}>
                {insights.isPending ? <Spinner /> : null}Record insights
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
