import { queryOptions } from '@tanstack/react-query'
import { getSelection, listOpenOpportunities } from './server/selection'

export const selectionQuery = (gigId: string) =>
  queryOptions({ queryKey: ['admin', 'selection', gigId], queryFn: () => getSelection({ data: { gigId } }), refetchInterval: 20_000 })
export const openOpportunitiesQuery = () =>
  queryOptions({ queryKey: ['admin', 'open-opportunities'], queryFn: () => listOpenOpportunities() })
