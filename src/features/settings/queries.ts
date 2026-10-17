import { queryOptions } from '@tanstack/react-query'
import { getSettings, listReviewTemplates } from './server/settings'

export const settingsQuery = () => queryOptions({ queryKey: ['admin', 'settings'], queryFn: () => getSettings() })
export const reviewTemplatesQuery = () =>
  queryOptions({ queryKey: ['admin', 'review-templates'], queryFn: () => listReviewTemplates(), staleTime: 5 * 60_000 })
