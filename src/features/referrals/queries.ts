import { queryOptions } from '@tanstack/react-query'
import {
  getMyReferrals,
  getReferralStats,
  listPrograms,
  listReferrals,
  listRewards,
  type ReferralsSearch,
  type RewardsSearch,
} from './server/referrals'

export const programsQuery = () => queryOptions({ queryKey: ['admin', 'referral-programs'], queryFn: () => listPrograms() })
export const referralStatsQuery = () => queryOptions({ queryKey: ['admin', 'referral-stats'], queryFn: () => getReferralStats() })
export const referralsQuery = (search: ReferralsSearch) =>
  queryOptions({ queryKey: ['admin', 'referrals', search], queryFn: () => listReferrals({ data: search }) })
export const rewardsQuery = (search: RewardsSearch) =>
  queryOptions({ queryKey: ['admin', 'rewards', search], queryFn: () => listRewards({ data: search }) })
export const myReferralsQuery = () => queryOptions({ queryKey: ['w', 'referrals'], queryFn: () => getMyReferrals() })
