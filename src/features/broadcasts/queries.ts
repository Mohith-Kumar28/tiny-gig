import { queryOptions } from '@tanstack/react-query'
import { listBroadcasts } from './server/broadcasts'

export const broadcastsQuery = () => queryOptions({ queryKey: ['admin', 'broadcasts'], queryFn: () => listBroadcasts() })
