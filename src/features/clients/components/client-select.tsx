import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { tagDot } from '@/features/accounts/components/client-chip'
import { useAction } from '@/hooks/use-action'
import { cn } from '@/lib/utils'
import { clientsQuery } from '../queries'
import { setSubmissionClient } from '../server/clients'
import { type ClientDraft, ClientDialog } from './clients-manager'

const NEW = '__new'

/**
 * Pick a client, or make one on the spot with "New client…" at the bottom of the list.
 * Clients are internal only: workers never see them.
 */
export function ClientPicker({
  value,
  onChange,
  disabled,
  noneLabel = 'No client',
  size = 'default',
  className,
}: {
  value: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
  noneLabel?: string
  size?: 'sm' | 'default'
  className?: string
}) {
  const { data: clients } = useQuery(clientsQuery())
  const [creating, setCreating] = useState<ClientDraft | null>(null)
  const small = size === 'sm'
  const live = (clients ?? []).filter((c) => !c.archivedAt || c.id === value)
  return (
    <>
      <Select
        value={value ?? 'none'}
        disabled={disabled}
        onValueChange={(v) => {
          if (v === NEW) setCreating({ name: '', color: 'blue' })
          else onChange(v === 'none' ? null : v)
        }}
      >
        <SelectTrigger size={small ? 'sm' : 'default'} className={cn(small ? 'h-7 w-auto gap-1.5 px-2 text-xs' : 'w-full', className)} aria-label="Client">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className={cn(small && 'text-xs')}>
            {noneLabel}
          </SelectItem>
          {live.map((c) => (
            <SelectItem key={c.id} value={c.id} className={cn(small && 'text-xs')}>
              <span className={cn('size-1.5 rounded-full', tagDot(c.color))} />
              {c.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={NEW} className={cn('text-ink focus:text-ink', small && 'text-xs')}>
            <Plus className="text-ink" />
            New client…
          </SelectItem>
        </SelectContent>
      </Select>
      <ClientDialog value={creating} onOpenChange={(o) => !o && setCreating(null)} onSaved={(id) => onChange(id)} />
    </>
  )
}

/** Tag a piece of work with its client (R43). Admin-only. */
export function SubmissionClientSelect({ submissionId, value }: { submissionId: string; value: string | null }) {
  const save = useAction((clientTagId: string | null) => setSubmissionClient({ data: { submissionId, clientTagId } }), {
    success: 'Client tag saved',
    invalidate: [['admin', 'submission', submissionId], ['admin', 'accounts'], ['admin', 'clients']],
  })
  return <ClientPicker size="sm" value={value} onChange={(id) => save.mutate(id)} disabled={save.isPending} noneLabel="No client tag" />
}
