import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter'
import { ClientChip, tagDot } from '@/features/accounts/components/client-chip'
import { cn } from '@/lib/utils'
import { NO_CLIENT } from '../client-filter'
import { clientsQuery } from '../queries'

export type ClientLite = { id: string; name: string; color: string }

/** "Client" facet for any admin table. Includes archived clients (old work keeps them) and "No client". */
export function ClientFilter({
  value,
  onChange,
  noneLabel = 'No client',
}: {
  value: string[] | undefined
  onChange: (next: string[] | undefined) => void
  noneLabel?: string
}) {
  const { data } = useQuery(clientsQuery())
  const options = [
    ...(data ?? []).map((c) => ({
      value: c.id,
      label: c.archivedAt ? `${c.name} (archived)` : c.name,
      icon: ({ className }: { className?: string }) => (
        <span className={cn('flex items-center justify-center', className)}>
          <span className={cn('size-2 rounded-full', tagDot(c.color))} />
        </span>
      ),
    })),
    { value: NO_CLIENT, label: noneLabel },
  ]
  return <DataTableFacetedFilter title="Client" options={options} value={value} onChange={onChange} />
}

/** One or more client chips; a dash when there are none. */
export function ClientChips({ clients, max = 3, className }: { clients: ClientLite[]; max?: number; className?: string }) {
  if (!clients.length) return <span className="text-muted-foreground">—</span>
  const shown = clients.slice(0, max)
  const more = clients.length - shown.length
  return (
    <span className={cn('flex flex-wrap items-center gap-1', className)} title={clients.map((c) => c.name).join(', ')}>
      {shown.map((c) => (
        <ClientChip key={c.id} name={c.name} color={c.color} />
      ))}
      {more > 0 ? <span className="text-xs text-muted-foreground">+{more}</span> : null}
    </span>
  )
}

/** Table column showing a row's client tags. `get` returns the row's clients. */
export function clientColumn<T>(get: (row: T) => ClientLite[], header = 'Client'): ColumnDef<T, unknown> {
  return {
    id: 'client',
    header,
    meta: { label: header },
    cell: ({ row }) => <ClientChips clients={get(row.original)} />,
  }
}

/** Rows that carry one optional client as flat fields (gigs, submissions). */
export function singleClient(r: { clientId: string | null; clientName: string | null; clientColor: string | null }): ClientLite[] {
  return r.clientId && r.clientName ? [{ id: r.clientId, name: r.clientName, color: r.clientColor ?? 'slate' }] : []
}
