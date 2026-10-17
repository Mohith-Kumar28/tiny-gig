import { queryOptions } from '@tanstack/react-query'
import { getReviewCounts, getSubmissionDetail, listReviewQueue, type ReviewSearch } from './server/admin-review'
import { getMySubmission, getMyWorkCounts, listMyWork, type MyWorkTab } from './server/worker-submissions'

export const reviewQueueQuery = (search: ReviewSearch) => {
  const { selected: _selected, ...rest } = search
  return queryOptions({ queryKey: ['admin', 'review', rest], queryFn: () => listReviewQueue({ data: rest }) })
}
export const reviewCountsQuery = () =>
  queryOptions({ queryKey: ['admin', 'review', 'counts'], queryFn: () => getReviewCounts(), refetchInterval: 60_000 })
export const submissionDetailQuery = (id: string) =>
  queryOptions({ queryKey: ['admin', 'submission', id], queryFn: () => getSubmissionDetail({ data: { id } }) })
export const myWorkQuery = (tab: MyWorkTab) =>
  queryOptions({ queryKey: ['w', 'work', tab], queryFn: () => listMyWork({ data: { tab } }) })
export const myWorkCountsQuery = () => queryOptions({ queryKey: ['w', 'work', 'counts'], queryFn: () => getMyWorkCounts() })
export const mySubmissionQuery = (id: string) =>
  queryOptions({ queryKey: ['w', 'submission', id], queryFn: () => getMySubmission({ data: { id } }) })
