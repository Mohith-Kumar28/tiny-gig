import { queryOptions } from '@tanstack/react-query'
import { type EmailLogSearch, listEmailLog } from './server/email-log'

export const emailLogQuery = (search: EmailLogSearch) =>
  queryOptions({ queryKey: ['admin', 'emails', search], queryFn: () => listEmailLog({ data: search }) })
