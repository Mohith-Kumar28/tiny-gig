import { queryOptions } from '@tanstack/react-query'
import { listClients } from './server/clients'

export const clientsQuery = () => queryOptions({ queryKey: ['admin', 'clients'], queryFn: () => listClients(), staleTime: 60_000 })
