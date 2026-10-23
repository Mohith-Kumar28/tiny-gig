import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useHotkeys } from '@/hooks/use-hotkeys'
import type { RowPager } from '@/hooks/use-row-pager'
import { cn } from '@/lib/utils'

/**
 * "‹ 3 of 25 ›" for a sheet opened from a table row. J / K (or ↓ / ↑) move between rows
 * without closing the sheet.
 */
export function SheetPager({ pager, hotkeys = true, className }: { pager?: RowPager; hotkeys?: boolean; className?: string }) {
  useHotkeys(
    {
      j: () => pager?.hasNext && pager.next(),
      arrowdown: () => pager?.hasNext && pager.next(),
      k: () => pager?.hasPrev && pager.prev(),
      arrowup: () => pager?.hasPrev && pager.prev(),
    },
    hotkeys && !!pager && pager.total > 1,
  )
  if (!pager || pager.total < 2) return null
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" onClick={pager.prev} disabled={!pager.hasPrev} aria-label="Previous">
            <ChevronUp />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Previous <Kbd>K</Kbd>
        </TooltipContent>
      </Tooltip>
      <span className="min-w-14 text-center text-xs text-muted-foreground tabular-nums">
        {pager.index >= 0 ? `${pager.index + 1} of ${pager.total}` : `${pager.total} left`}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" onClick={pager.next} disabled={!pager.hasNext} aria-label="Next">
            <ChevronDown />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Next <Kbd>J</Kbd>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
