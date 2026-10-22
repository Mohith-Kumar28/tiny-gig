import { queryOptions } from '@tanstack/react-query'
import { getMyWarmup, listWarmupItems } from './server/warmup'

export const warmupItemsQuery = () => queryOptions({ queryKey: ['admin', 'warmup'], queryFn: () => listWarmupItems() })
export const myWarmupQuery = () => queryOptions({ queryKey: ['w', 'warmup'], queryFn: () => getMyWarmup() })
