import { useQuery } from '@tanstack/react-query'
import { Archive, ArchiveRestore, Pencil, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { SettingsSection } from '@/features/settings/components/settings-section'
import { ClientChip, TAG_COLORS, type TagColor, tagDot } from '@/features/accounts/components/client-chip'
import { useAction } from '@/hooks/use-action'
import { cn } from '@/lib/utils'
import { clientsQuery } from '../queries'
import { saveClient, setClientArchived } from '../server/clients'

type Draft = { id?: string; name: string; color: TagColor }

function ClientDialog({ value, onOpenChange }: { value: Draft | null; onOpenChange: (o: boolean) => void }) {
  const [draft, setDraft] = useState<Draft>({ name: '', color: 'blue' })
  useEffect(() => {
    if (value) setDraft(value)
  }, [value])
  const save = useAction((d: Draft) => saveClient({ data: d }), {
    success: (_r, d) => (d.id ? 'Client updated' : 'Client added'),
    invalidate: [['admin', 'clients'], ['admin', 'accounts']],
    onSuccess: () => onOpenChange(false),
  })
  const valid = draft.name.trim().length > 0
  return (
    <Dialog open={!!value} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{value?.id ? 'Edit client' : 'New client'}</DialogTitle>
          <DialogDescription>Internal only: workers never see client names.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) save.mutate({ ...draft, name: draft.name.trim() })
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="client-name">Name</Label>
            <Input id="client-name" autoFocus maxLength={40} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Acme" />
          </div>
          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setDraft({ ...draft, color: c })}
                  className={cn('size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow duration-150 focus-visible:outline-2 focus-visible:outline-ring', tagDot(c), draft.color === c && 'ring-2 ring-foreground')}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || save.isPending}>
              {save.isPending ? <Spinner /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Client tags (§9): the data the same-client rules and per-client reporting run on. */
export function ClientsManager() {
  const { data, isLoading } = useQuery(clientsQuery())
  const [editing, setEditing] = useState<Draft | null>(null)
  const archive = useAction((v: { id: string; archived: boolean }) => setClientArchived({ data: v }), {
    success: (_r, v) => (v.archived ? 'Client archived' : 'Client restored'),
    invalidate: [['admin', 'clients']],
  })
  return (
    <SettingsSection
      title="Clients"
      description="Tag work with the client it was for. Drives the same-client cooldowns and the roster’s Last client column. Workers never see client names."
      actions={
        <Button size="sm" variant="outline" onClick={() => setEditing({ name: '', color: 'blue' })}>
          <Plus /> New client
        </Button>
      }
    >
      {isLoading ? (
        <Skeleton className="h-32 rounded-lg" />
      ) : !data?.length ? (
        <EmptyState title="No clients yet" description="Add the clients you post for with New client, then pick one on each gig." />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/45">
              <tr>
                <th className="ledger-label px-4 py-2 text-left">Client</th>
                <th className="ledger-label px-3 py-2 text-right">Posts 7d</th>
                <th className="ledger-label px-3 py-2 text-right">Posts 30d</th>
                <th className="ledger-label px-3 py-2 text-right">Accounts 30d</th>
                <th className="ledger-label px-3 py-2 text-right">Approved</th>
                <th className="ledger-label px-3 py-2 text-right">Spend</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((c) => (
                <tr key={c.id} className={cn('group transition-colors duration-150 hover:bg-muted/45', c.archivedAt && 'text-muted-foreground')}>
                  <td className="px-4 py-2.5">
                    <ClientChip name={c.name} color={c.color} />
                    {c.archivedAt ? <span className="ml-2 text-xs text-muted-foreground">archived</span> : null}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular">{c.posts7}</td>
                  <td className="px-3 py-2.5 text-right tabular">{c.posts30}</td>
                  <td className="px-3 py-2.5 text-right tabular">{c.accounts30}</td>
                  <td className="px-3 py-2.5 text-right tabular">{c.approved}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Money paise={c.spend} className="font-display font-bold" />
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <div className="flex justify-end gap-0.5 opacity-60 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="size-7" aria-label="Edit" onClick={() => setEditing({ id: c.id, name: c.name, color: c.color as TagColor })}>
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={c.archivedAt ? 'Restore' : 'Archive'}
                        onClick={() => archive.mutate({ id: c.id, archived: !c.archivedAt })}
                      >
                        {c.archivedAt ? <ArchiveRestore /> : <Archive />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ClientDialog value={editing} onOpenChange={(o) => !o && setEditing(null)} />
    </SettingsSection>
  )
}
