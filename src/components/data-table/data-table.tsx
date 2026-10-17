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
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onResetFilters}>
            Reset
            <X />
          </Button>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {toolbarActions}
          <DataTableViewOptions table={table} />
        </div>
      </div>

      <div className={cn('overflow-hidden rounded-xl border bg-card transition-opacity', isFetching && 'opacity-70')}>
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className={cn('h-9 text-xs font-medium', h.column.columnDef.meta?.headerClassName)}>
                    {h.isPlaceholder ? null : typeof h.column.columnDef.header === 'string' ? (
                      <DataTableColumnHeader
                        column={h.column}
                        title={h.column.columnDef.header}
                        sort={search.sort}
                        onSearchChange={onSearchChange}
                      />
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : activeRowId === row.id ? 'selected' : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && 'cursor-pointer')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn('py-2.5', cell.column.columnDef.meta?.className)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={allColumns.length} className="h-40 text-center text-sm text-muted-foreground">
                  {data ? (empty ?? 'No results.') : 'Loading…'}
                </TableCell>
              </TableRow>
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
          <div className="flex items-center gap-2 rounded-xl border bg-popover px-3 py-2 text-popover-foreground shadow-lg animate-in fade-in slide-in-from-bottom-2">
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
