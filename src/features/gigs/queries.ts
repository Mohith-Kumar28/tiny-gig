import { queryOptions } from '@tanstack/react-query'
import { getGigAdmin, type GigsSearch, listGigOptions, listGigs } from './server/admin-gigs'
import { type AvailableGigsSearch, getGigForWorker, listAvailableGigs } from './server/worker-gigs'

export const gigsQuery = (search: GigsSearch) =>
  queryOptions({ queryKey: ['admin', 'gigs', search], queryFn: () => listGigs({ data: search }) })
export const gigAdminQuery = (id: string) =>
  queryOptions({ queryKey: ['admin', 'gig', id], queryFn: () => getGigAdmin({ data: { id } }) })
export const gigOptionsQuery = () =>
  queryOptions({ queryKey: ['admin', 'gig-options'], queryFn: () => listGigOptions(), staleTime: 5 * 60_000 })
export const availableGigsQuery = (search: AvailableGigsSearch) =>
  queryOptions({ queryKey: ['w', 'gigs', search], queryFn: () => listAvailableGigs({ data: search }) })
export const workerGigQuery = (id: string) =>
  queryOptions({ queryKey: ['w', 'gig', id], queryFn: () => getGigForWorker({ data: { id } }) })
