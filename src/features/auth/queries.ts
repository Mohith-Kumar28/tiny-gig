import { queryOptions } from '@tanstack/react-query'
import { getViewer } from './server/viewer'

export const viewerQuery = () => queryOptions({ queryKey: ['viewer'], queryFn: () => getViewer(), staleTime: 60_000 })
