import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SheetPager } from '@/components/shared/sheet-pager'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import type { RowPager } from '@/hooks/use-row-pager'
import { SubmissionReviewPanel } from './submission-review-panel'

/** Review any submission from any table without leaving the page. */
export function SubmissionReviewSheet({
  submissionId,
  onOpenChange,
  pager,
}: {
  submissionId: string | null
  onOpenChange: (open: boolean) => void
  /** Previous / next through the table behind the sheet; a decision moves on to the next row. */
  pager?: RowPager
}) {
  return (
    <Sheet open={!!submissionId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-2xl xl:max-w-3xl" showCloseButton={false}>
        {/* Own top bar so the close button never sits on the panel's amount or stamps */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b pr-2 pl-4">
          <SheetTitle className="text-sm">Review submission</SheetTitle>
          <SheetDescription className="sr-only">Proof, worker and decision</SheetDescription>
          <SheetPager pager={pager} className="ml-auto" />
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className={pager && pager.total > 1 ? 'size-9' : 'ml-auto size-9'} aria-label="Close">
              <X />
            </Button>
          </SheetClose>
        </div>
        <div className="min-h-0 flex-1">
          {submissionId ? <SubmissionReviewPanel id={submissionId} hotkeys key={submissionId} onDecided={() => (pager ? pager.advance() : onOpenChange(false))} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
