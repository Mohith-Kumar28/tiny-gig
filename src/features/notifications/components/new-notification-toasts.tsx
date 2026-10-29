import { useQuery } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { notificationsQuery } from '../queries'

const SEEN_KEY = 'tinygig:notifications-toasted-until'
const MAX_TOASTS = 3

/**
 * Pops unread notifications the worker hasn't been shown yet, on open and as new ones arrive
 * (the query refetches every minute). Remembers per device what it already showed.
 */
export function NewNotificationToasts() {
  const { data } = useQuery(notificationsQuery())
  const navigate = useNavigate()
  const onNotificationsPage = useRouterState({ select: (s) => s.location.pathname === '/w/notifications' })

  useEffect(() => {
    if (!data) return
    const seenUntil = Number(localStorage.getItem(SEEN_KEY) ?? 0)
    const fresh = [...data.pinned, ...data.rows]
      .filter((n) => !n.readAt && new Date(n.createdAt).getTime() > seenUntil)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    if (!fresh.length) return
    localStorage.setItem(SEEN_KEY, String(new Date(fresh[0]?.createdAt ?? Date.now()).getTime()))
    if (onNotificationsPage) return
    for (const n of fresh.slice(0, MAX_TOASTS)) {
      toast(n.title, {
        id: `notification-${n.id}`,
        description: n.body ?? undefined,
        duration: 12_000,
        action: { label: 'View', onClick: () => navigate({ to: n.html ? '/w/notifications' : (n.href ?? '/w/notifications') }) },
      })
    }
    if (fresh.length > MAX_TOASTS) {
      toast(`${fresh.length - MAX_TOASTS} more new notification${fresh.length - MAX_TOASTS === 1 ? '' : 's'}`, {
        duration: 12_000,
        action: { label: 'Open', onClick: () => navigate({ to: '/w/notifications' }) },
      })
    }
  }, [data, navigate, onNotificationsPage])

  return null
}
