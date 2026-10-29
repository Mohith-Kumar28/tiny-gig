import { queryOptions } from '@tanstack/react-query'
import { getMyWhatsappGroup, listNotifications } from './server/notifications'

export const notificationsQuery = (limit = 30) =>
  queryOptions({
    queryKey: ['notifications', limit],
    queryFn: () => listNotifications({ data: { limit } }),
    refetchInterval: 60_000,
  })

export const myWhatsappGroupQuery = () =>
  queryOptions({ queryKey: ['w', 'whatsapp-group'], queryFn: () => getMyWhatsappGroup(), staleTime: 10 * 60_000 })
