import { queryOptions } from '@tanstack/react-query'
import { listMyAccounts } from './server/my-accounts'
import { getAccountHistory, listAccounts, type RosterSearch } from './server/roster'

export const rosterQuery = (search: RosterSearch) =>
  queryOptions({ queryKey: ['admin', 'accounts', search], queryFn: () => listAccounts({ data: search }) })
export const accountHistoryQuery = (id: string) =>
  queryOptions({ queryKey: ['admin', 'accounts', 'history', id], queryFn: () => getAccountHistory({ data: { id } }) })

export const myAccountsQuery = () => queryOptions({ queryKey: ['w', 'accounts'], queryFn: () => listMyAccounts() })
