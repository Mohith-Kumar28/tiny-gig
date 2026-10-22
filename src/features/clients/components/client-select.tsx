import { useQuery } from '@tanstack/react-query'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { tagDot } from '@/features/accounts/components/client-chip'
import { useAction } from '@/hooks/use-action'
import { cn } from '@/lib/utils'
import { clientsQuery } from '../queries'
import { setSubmissionClient } from '../server/clients'

/** Tag a piece of work with its client (R43). Admin-only. */
export function SubmissionClientSelect({ submissionId, value }: { submissionId: string; value: string | null }) {
  const { data: clients } = useQuery(clientsQuery())
  const save = useAction((clientTagId: string | null) => setSubmissionClient({ data: { submissionId, clientTagId } }), {
    success: 'Client tag saved',
    invalidate: [['admin', 'submission', submissionId], ['admin', 'accounts'], ['admin', 'clients']],
  })
  return (
    <Select value={value ?? 'none'} onValueChange={(v) => save.mutate(v === 'none' ? null : v)} disabled={save.isPending}>
      <SelectTrigger size="sm" className="h-7 w-auto gap-1.5 px-2 text-xs" aria-label="Client">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-xs">
          No client tag
        </SelectItem>
        {(clients ?? [])
          .filter((c) => !c.archivedAt || c.id === value)
          .map((c) => (
            <SelectItem key={c.id} value={c.id} className="text-xs">
              <span className={cn('size-1.5 rounded-full', tagDot(c.color))} />
              {c.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}
