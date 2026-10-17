import { queryOptions } from '@tanstack/react-query'
import { listNotifications } from './server/notifications'

export const notificationsQuery = (limit = 30) =>
  queryOptions({
    queryKey: ['notifications', limit],
    queryFn: () => listNotifications({ data: { limit } }),
    refetchInterval: 60_000,
  })
