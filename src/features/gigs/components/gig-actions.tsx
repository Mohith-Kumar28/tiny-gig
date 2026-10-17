import { useNavigate } from '@tanstack/react-router'
import { Copy, MoreHorizontal, Pause, Pencil, Play, Send, Square, Trash2 } from 'lucide-react'
import { useState } from 'react'
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
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { GigStatus } from '@/db/schema/enums'
import { useAction } from '@/hooks/use-action'
import { deleteGig, duplicateGig, setGigStatus } from '../server/admin-gigs'

const VERB: Record<GigStatus, string> = { live: 'published', paused: 'paused', closed: 'closed', draft: 'moved to draft' }

/** Publish / pause / close any number of gigs with a toast that reports notified workers. */
export function useGigStatus(onDone?: () => void) {
  return useAction((v: { ids: string[]; status: GigStatus }) => setGigStatus({ data: v }), {
    success: (r, v) => {
      const base = `${r.updated} gig${r.updated === 1 ? '' : 's'} ${VERB[v.status]}`
      return r.notified ? `${base} · ${r.notified} worker${r.notified === 1 ? '' : 's'} emailed` : base
    },
    invalidate: [['admin']],
    onSuccess: () => onDone?.(),
  })
}

export function useDuplicateGig() {
  const navigate = useNavigate()
  return useAction((id: string) => duplicateGig({ data: { id } }), {
    success: 'Duplicated as a draft',
    invalidate: [['admin', 'gigs']],
    onSuccess: (r) => {
      if (r.id) navigate({ to: '/admin/gigs/$gigId/edit', params: { gigId: r.id } })
    },
  })
}

/** Next sensible status transitions for a gig. */
export function statusTransitions(status: GigStatus): { status: GigStatus; label: string; icon: typeof Play }[] {
  switch (status) {
    case 'draft':
      return [{ status: 'live', label: 'Publish', icon: Send }]
    case 'live':
      return [
        { status: 'paused', label: 'Pause', icon: Pause },
        { status: 'closed', label: 'Close', icon: Square },
      ]
    case 'paused':
      return [
        { status: 'live', label: 'Resume', icon: Play },
        { status: 'closed', label: 'Close', icon: Square },
      ]
    case 'closed':
      return [{ status: 'live', label: 'Reopen', icon: Play }]
  }
}

export function GigRowActions({ gig }: { gig: { id: string; title: string; status: GigStatus } }) {
  const navigate = useNavigate()
  const setStatus = useGigStatus()
  const duplicate = useDuplicateGig()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const remove = useAction(() => deleteGig({ data: { id: gig.id } }), {
    success: 'Gig deleted',
    invalidate: [['admin']],
    onSuccess: () => setConfirmDelete(false),
  })
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stops row click from firing
    <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7" aria-label="Gig actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => navigate({ to: '/admin/gigs/$gigId/edit', params: { gigId: gig.id } })}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => duplicate.mutate(gig.id)}>
            <Copy /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {statusTransitions(gig.status).map((t) => (
            <DropdownMenuItem key={t.status} onSelect={() => setStatus.mutate({ ids: [gig.id], status: t.status })}>
              <t.icon /> {t.label}
            </DropdownMenuItem>
          ))}
          {gig.status === 'draft' ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{gig.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This draft will be removed permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                remove.mutate(undefined)
              }}
              disabled={remove.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
