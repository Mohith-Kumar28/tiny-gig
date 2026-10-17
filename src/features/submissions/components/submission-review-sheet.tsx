import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { SubmissionReviewPanel } from './submission-review-panel'

/** Review any submission from any table without leaving the page. */
export function SubmissionReviewSheet({
  submissionId,
  onOpenChange,
}: {
  submissionId: string | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={!!submissionId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl">
        <SheetTitle className="sr-only">Review submission</SheetTitle>
        <SheetDescription className="sr-only">Proof, worker and decision</SheetDescription>
        {submissionId ? <SubmissionReviewPanel id={submissionId} hotkeys onDecided={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  )
}
