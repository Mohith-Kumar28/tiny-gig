import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type RowSelectionState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { X } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Paginated } from '@/lib/table-query'
import { cn } from '@/lib/utils'
import { DataTableColumnHeader } from './data-table-column-header'
import { DataTablePagination } from './data-table-pagination'
import { DataTableSearch } from './data-table-search'
import { DataTableViewOptions } from './data-table-view-options'
import type { OnSearchChange } from './types'

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: Paginated<TData> | undefined
  search: { sort?: string; q?: string }
  onSearchChange: OnSearchChange
  getRowId: (row: TData) => string
  /** Facet filters and extra toolbar controls. */
  filters?: ReactNode
  toolbarActions?: ReactNode
  searchPlaceholder?: string
  /** Rendered in the floating bar when rows are selected. */
  bulkActions?: (rows: TData[], clear: () => void) => ReactNode
  onRowClick?: (row: TData) => void
  activeRowId?: string
  isFetching?: boolean
  empty?: ReactNode
  hasActiveFilters?: boolean
  onResetFilters?: () => void
  initialHidden?: VisibilityState
}

/** Server-driven table: sorting, paging and filters all live in URL search params. */
export function DataTable<TData>({
  columns,
  data,
  search,
  onSearchChange,
  getRowId,
  filters,
  toolbarActions,
  searchPlaceholder,
  bulkActions,
  onRowClick,
  activeRowId,
  isFetching,
  empty,
  hasActiveFilters,
  onResetFilters,
  initialHidden,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialHidden ?? {})
  const rows = data?.rows ?? []

  // Drop selection when the page/filter changes so bulk actions never hit invisible rows.
  const pageKey = `${data?.page}-${data?.total}-${search.q}-${search.sort}`
  useEffect(() => setRowSelection({}), [pageKey])

  const allColumns = useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!bulkActions) return columns
    const select: ColumnDef<TData, unknown> = {
      id: '__select',
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
        />
      ),
      meta: { className: 'w-9', headerClassName: 'w-9' },
    }
    return [select, ...columns]
  }, [columns, bulkActions])

  const table = useReactTable({
    data: rows,
    columns: allColumns,
    getRowId,
    state: { rowSelection, columnVisibility },
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: data?.pageCount ?? 1,
  })

  const selected = table.getSelectedRowModel().rows.map((r) => r.original)
  const clear = () => setRowSelection({})

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <DataTableSearch value={search.q} onChange={(q) => onSearchChange({ q })} placeholder={searchPlaceholder} />
        {filters}
        {hasActiveFilters && onResetFilters ? (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground" onClick={onResetFilters}>
            Reset
            <X />
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {toolbarActions}
          <DataTableViewOptions table={table} />
        </div>
      </div>

      <div className={cn('overflow-hidden rounded-lg border bg-card transition-opacity duration-200', isFetching && 'opacity-70')}>
        <Table className="tabular">
          <TableHeader className="bg-muted/45 [&_tr]:border-b-foreground/12">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h) => {
                  const headerClassName = h.column.columnDef.meta?.headerClassName
                  return (
                    <TableHead
                      key={h.id}
                      className={cn(
                        'ledger-label h-9 px-2.5 font-semibold text-muted-foreground first:pl-4 last:pr-3',
                        headerClassName,
                      )}
                    >
                      {h.isPlaceholder ? null : typeof h.column.columnDef.header === 'string' ? (
                        <DataTableColumnHeader
                          column={h.column}
                          title={h.column.columnDef.header}
                          sort={search.sort}
                          onSearchChange={onSearchChange}
                          align={headerClassName?.includes('text-right') ? 'right' : 'left'}
                        />
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() || activeRowId === row.id ? 'selected' : undefined}
                  data-active={activeRowId === row.id ? '' : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    'transition-colors duration-150 hover:bg-muted/45 data-[state=selected]:bg-ink/[0.05] data-[active]:bg-ink/[0.08]',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn('h-12 px-2.5 py-2 first:pl-4 last:pr-3', cell.column.columnDef.meta?.className)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={allColumns.length} className="h-40 text-center text-sm whitespace-normal text-muted-foreground">
                  {empty ?? 'No results.'}
                </TableCell>
              </TableRow>
            ) : (
              Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i} className="hover:bg-transparent" aria-hidden>
                  {table.getVisibleLeafColumns().map((c) => (
                    <TableCell key={c.id} className="h-12 px-2.5 first:pl-4 last:pr-3">
                      <Skeleton className={cn('h-3.5', c.id === '__select' ? 'w-4' : 'w-full max-w-28')} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data ? (
        <DataTablePagination
          page={data.page}
          pageCount={data.pageCount}
          perPage={data.perPage}
          total={data.total}
          selectedCount={selected.length}
          onSearchChange={onSearchChange}
        />
      ) : null}

      {bulkActions && selected.length > 0 ? (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <span className="px-1 text-sm font-medium tabular">{selected.length} selected</span>
            <div className="h-5 w-px bg-border" />
            {bulkActions(selected, clear)}
            <Button variant="ghost" size="icon" className="size-8" onClick={clear} aria-label="Clear selection">
              <X />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
