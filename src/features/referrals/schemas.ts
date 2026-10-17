import { z } from 'zod'
import { REFERRAL_TRIGGERS } from '@/db/schema/enums'

const int = (min: number, max: number) => z.coerce.number<string | number>().int().min(min).max(max)
const optionalInt = (min: number, max: number) =>
  z.union([z.literal(''), z.null(), z.coerce.number<string | number>().int().min(min).max(max)]).optional()

export const programFormSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  active: z.boolean(),
  trigger: z.enum(REFERRAL_TRIGGERS),
  /** Gig count for gigs_approved, rupees for earned_at_least. */
  triggerValue: int(0, 1_000_000),
  threshold: int(1, 1000),
  referrerRewardRupees: z.coerce.number<string | number>().min(0).max(100_000),
  refereeRewardRupees: z.coerce.number<string | number>().min(0).max(100_000),
  repeatMode: z.enum(['once', 'every']),
  maxRewardsPerReferrer: optionalInt(1, 10_000),
  qualifyWithinDays: optionalInt(1, 3650),
  autoApprove: z.boolean(),
  startsAt: z.string().optional().or(z.literal('')),
  endsAt: z.string().optional().or(z.literal('')),
})
export type ProgramFormInput = z.input<typeof programFormSchema>

export const PROGRAM_FORM_DEFAULTS: ProgramFormInput = {
  name: 'Invite 3 friends',
  description: '',
  active: true,
  trigger: 'first_gig_approved',
  triggerValue: 1,
  threshold: 3,
  referrerRewardRupees: 150,
  refereeRewardRupees: 50,
  repeatMode: 'every',
  maxRewardsPerReferrer: 10,
  qualifyWithinDays: 30,
  autoApprove: false,
  startsAt: '',
  endsAt: '',
}
