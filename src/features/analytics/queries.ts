import { queryOptions } from '@tanstack/react-query'
import { getAdminBadges } from './server/admin-shell'
import { getAdminOverview, getWorkerOverview } from './server/analytics'

export const adminOverviewQuery = () =>
  queryOptions({ queryKey: ['admin', 'overview'], queryFn: () => getAdminOverview(), refetchInterval: 120_000 })
export const workerOverviewQuery = () => queryOptions({ queryKey: ['w', 'overview'], queryFn: () => getWorkerOverview() })
export const adminBadgesQuery = () =>
  queryOptions({ queryKey: ['admin', 'badges'], queryFn: () => getAdminBadges(), refetchInterval: 60_000 })
