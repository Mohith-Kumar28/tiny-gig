import type { RowData } from '@tanstack/react-table'

export type SearchPatch = Record<string, unknown>
export type OnSearchChange = (patch: SearchPatch) => void

export type FacetOption = { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }

declare module '@tanstack/react-table' {
  // biome-ignore lint/correctness/noUnusedVariables: generic params required by declaration merging
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Server sort key; enables the sortable header. */
    sortKey?: string
    className?: string
    headerClassName?: string
    label?: string
  }
}
