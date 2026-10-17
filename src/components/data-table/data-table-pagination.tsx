import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatNumber } from '@/lib/format'
import type { OnSearchChange } from './types'

export function DataTablePagination({
  page,
  pageCount,
  perPage,
  total,
  selectedCount,
  onSearchChange,
}: {
  page: number
  pageCount: number
  perPage: number
  total: number
  selectedCount?: number
  onSearchChange: OnSearchChange
}) {
  const go = (p: number) => onSearchChange({ page: p <= 1 ? undefined : p })
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(total, page * perPage)
  return (
    <div className="flex flex-col-reverse items-center justify-between gap-3 px-1 text-sm sm:flex-row">
      <div className="text-muted-foreground tabular">
        {selectedCount ? `${formatNumber(selectedCount)} selected · ` : ''}
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-muted-foreground">Rows</span>
          <Select value={String(perPage)} onValueChange={(v) => onSearchChange({ perPage: Number(v), page: undefined })}>
            <SelectTrigger size="sm" className="h-8 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="tabular text-muted-foreground">
          Page {page} of {pageCount}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="hidden size-8 sm:inline-flex" onClick={() => go(1)} disabled={page <= 1} aria-label="First page">
            <ChevronsLeft />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => go(page + 1)} disabled={page >= pageCount} aria-label="Next page">
            <ChevronRight />
          </Button>
          <Button variant="outline" size="icon" className="hidden size-8 sm:inline-flex" onClick={() => go(pageCount)} disabled={page >= pageCount} aria-label="Last page">
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
