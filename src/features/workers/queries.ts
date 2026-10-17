import { queryOptions } from '@tanstack/react-query'
import { getOnboardingDefaults } from './server/application'
import { getWorkerDetail, getWorkerStatusCounts, listWorkers, type WorkersSearch } from './server/admin-workers'
import { getMyProfile } from './server/profile'

export const onboardingDefaultsQuery = () =>
  queryOptions({ queryKey: ['onboarding-defaults'], queryFn: () => getOnboardingDefaults() })
export const myProfileQuery = () => queryOptions({ queryKey: ['me', 'profile'], queryFn: () => getMyProfile() })
export const workersQuery = (search: WorkersSearch) =>
  queryOptions({ queryKey: ['admin', 'workers', search], queryFn: () => listWorkers({ data: search }) })
export const workerStatusCountsQuery = () =>
  queryOptions({ queryKey: ['admin', 'workers', 'counts'], queryFn: () => getWorkerStatusCounts() })
export const workerDetailQuery = (userId: string) =>
  queryOptions({ queryKey: ['admin', 'worker', userId], queryFn: () => getWorkerDetail({ data: { userId } }) })
