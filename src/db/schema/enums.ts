export const ROLES = ['admin', 'worker'] as const
export type Role = (typeof ROLES)[number]

export const WORKER_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'suspended'] as const
export type WorkerStatus = (typeof WORKER_STATUSES)[number]

export const PLATFORMS = ['reddit', 'x', 'linkedin', 'threads', 'instagram', 'other'] as const
export type Platform = (typeof PLATFORMS)[number]

export const TASK_TYPES = ['post', 'comment', 'reply', 'upvote', 'other'] as const
export type TaskType = (typeof TASK_TYPES)[number]

export const GIG_STATUSES = ['draft', 'live', 'paused', 'closed'] as const
export type GigStatus = (typeof GIG_STATUSES)[number]

export const SUBMISSION_STATUSES = [
  'claimed',
  'submitted',
  'changes_requested',
  'resubmitted',
  'live_check',
  'approved',
  'rejected',
  'expired',
  'withdrawn',
] as const
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

export const SUBMISSION_ACTIONS = [
  'claimed',
  'submitted',
  'resubmitted',
  'changes_requested',
  'moved_to_live_check',
  'approved',
  'rejected',
  'expired',
  'withdrawn',
  'comment',
] as const
export type SubmissionAction = (typeof SUBMISSION_ACTIONS)[number]

export const PAYOUT_STATUSES = ['pending', 'processing', 'paid', 'failed'] as const
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number]

export const REFERRAL_TRIGGERS = [
  'signed_up',
  'approved',
  'first_gig_approved',
  'gigs_approved',
  'earned_at_least',
] as const
export type ReferralTrigger = (typeof REFERRAL_TRIGGERS)[number]

export const REWARD_STATUSES = ['pending_review', 'approved', 'paid', 'void'] as const
export type RewardStatus = (typeof REWARD_STATUSES)[number]

export const REWARD_ROLES = ['referrer', 'referee'] as const
export type RewardRole = (typeof REWARD_ROLES)[number]

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const
