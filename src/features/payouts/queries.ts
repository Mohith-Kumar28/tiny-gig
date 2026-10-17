import { queryOptions } from '@tanstack/react-query'
import { getMyEarnings, getPayableBalances, getPayoutItems, listPayouts, type PayoutsSearch } from './server/payouts'

export const payableBalancesQuery = () =>
  queryOptions({ queryKey: ['admin', 'payouts', 'balances'], queryFn: () => getPayableBalances() })
export const payoutsQuery = (search: PayoutsSearch) =>
  queryOptions({ queryKey: ['admin', 'payouts', 'list', search], queryFn: () => listPayouts({ data: search }) })
export const payoutItemsQuery = (id: string) =>
  queryOptions({ queryKey: ['admin', 'payouts', 'items', id], queryFn: () => getPayoutItems({ data: { id } }) })
export const myEarningsQuery = () => queryOptions({ queryKey: ['w', 'earnings'], queryFn: () => getMyEarnings() })
