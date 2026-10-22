import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useAction } from '@/hooks/use-action'
import { initials } from '@/lib/format'
import { adminsQuery } from '../queries'
import { addAdmin, removeAdmin } from '../server/admins'
import { SettingsSection } from './settings-section'

/** Who can use the admin dashboard. Same platform, same data. Just more people. */
export function AdminTeam() {
  const { data, isLoading } = useQuery(adminsQuery())
  const [email, setEmail] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  const add = useAction((v: string) => addAdmin({ data: { email: v } }), {
    success: (r) => (r.status === 'active' ? 'Admin added. They need to sign in again.' : 'Invite sent'),
    invalidate: [['admin', 'team']],
    onSuccess: () => setEmail(''),
  })
  const remove = useAction((v: string) => removeAdmin({ data: { email: v } }), {
    success: 'Admin access removed',
    invalidate: [['admin', 'team']],
    onSuccess: () => setRemoving(null),
  })

  return (
    <SettingsSection
      title="Admins"
      description="Everyone here can use this console and sees the same data. New admins are told by email. Owners are set in the server config and can’t be removed here."
    >
      <div className="rounded-lg border bg-card">
        <form
          className="flex flex-col gap-2 border-b p-4 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            if (email.trim()) add.mutate(email.trim())
          }}
        >
          <Input
            type="email"
            inputMode="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Admin email"
            className="sm:flex-1"
          />
          <Button type="submit" disabled={!email.trim() || add.isPending}>
            {add.isPending ? <Spinner /> : <Plus />}
            Add admin
          </Button>
        </form>

        {isLoading ? (
          <div className="space-y-3 p-4">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <ul className="divide-y">
            {data?.map((a) => (
              <li key={a.email} className="flex items-center gap-3 px-4 py-3">
                <Avatar className="size-9">
                  {a.image ? <AvatarImage src={a.image} alt="" /> : null}
                  <AvatarFallback className="text-xs">{initials(a.name || a.email)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    {a.name || a.email}
                    {a.isYou ? <span className="text-xs font-normal text-muted-foreground">(you)</span> : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.name ? a.email : null}
                    {a.status === 'active' && a.addedAt ? (
                      <>
                        {a.name ? ' · ' : ''}joined <RelativeTime date={a.addedAt} />
                      </>
                    ) : null}
                  </p>
                </div>
                {a.owner ? <StatusBadge status="owner" label="Owner" /> : null}
                {a.status === 'invited' ? <StatusBadge status="pending" label="Invited" /> : null}
                {!a.owner && !a.isYou ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setRemoving(a.email)}
                    aria-label={`Remove ${a.email}`}
                  >
                    <Trash2 />
                  </Button>
                ) : (
                  <span className="size-8" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove admin access?</AlertDialogTitle>
            <AlertDialogDescription>{removing} will be signed out and lose access to the admin dashboard.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                if (removing) remove.mutate(removing)
              }}
              disabled={remove.isPending}
            >
              {remove.isPending ? <Spinner /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  )
}
