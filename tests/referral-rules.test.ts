import { describe, expect, it } from 'vitest'
import {
  describeProgram,
  isProgramRunning,
  nextTierProgress,
  type ProgramRule,
  type ReferralProgress,
  refereeQualifies,
  referrerTiersEarned,
} from '@/features/referrals/rules'

const base: ProgramRule = {
  trigger: 'first_gig_approved',
  triggerValue: 1,
  threshold: 3,
  referrerReward: 15000,
  refereeReward: 5000,
  repeatMode: 'every',
  maxRewardsPerReferrer: 2,
  qualifyWithinDays: 30,
  startsAt: null,
  endsAt: null,
  active: true,
}
const ref = (o: Partial<ReferralProgress> = {}): ReferralProgress => ({
  attributedAt: new Date('2026-10-01'),
  approvedAt: new Date('2026-10-02'),
  firstGigApprovedAt: new Date('2026-10-05'),
  gigsApproved: 1,
  earned: 5000,
  flagged: false,
  ...o,
})

describe('referral rules', () => {
  it('counts tiers with repeat and cap', () => {
    expect(referrerTiersEarned(base, 2)).toBe(0)
    expect(referrerTiersEarned(base, 3)).toBe(1)
    expect(referrerTiersEarned(base, 7)).toBe(2)
    expect(referrerTiersEarned({ ...base, maxRewardsPerReferrer: null }, 9)).toBe(3)
    expect(referrerTiersEarned({ ...base, repeatMode: 'once' }, 9)).toBe(1)
  })

  it('tracks progress toward the next tier', () => {
    expect(nextTierProgress(base, 4)).toMatchObject({ earned: 1, current: 1, target: 3, done: false })
    expect(nextTierProgress(base, 6)).toMatchObject({ earned: 2, done: true })
  })

  it('qualifies referees by milestone, window and flags', () => {
    const now = new Date('2026-10-10')
    expect(refereeQualifies(base, ref(), now)).toBe(true)
    expect(refereeQualifies(base, ref({ firstGigApprovedAt: null }), now)).toBe(false)
    expect(refereeQualifies(base, ref({ flagged: true }), now)).toBe(false)
    expect(refereeQualifies(base, ref({ firstGigApprovedAt: new Date('2026-11-15') }), now)).toBe(false)
    expect(refereeQualifies({ ...base, startsAt: new Date('2026-10-03') }, ref(), now)).toBe(false)
    expect(refereeQualifies({ ...base, trigger: 'gigs_approved', triggerValue: 3 }, ref({ gigsApproved: 2 }), now)).toBe(false)
    expect(refereeQualifies({ ...base, trigger: 'earned_at_least', triggerValue: 5000, qualifyWithinDays: null }, ref(), now)).toBe(true)
  })

  it('knows whether a program is running', () => {
    const now = new Date('2026-10-10')
    expect(isProgramRunning(base, now)).toBe(true)
    expect(isProgramRunning({ ...base, active: false }, now)).toBe(false)
    expect(isProgramRunning({ ...base, endsAt: new Date('2026-10-09') }, now)).toBe(false)
  })

  it('describes a program in plain English', () => {
    expect(describeProgram(base)).toContain('When 3 referred workers get their first gig approved')
    expect(describeProgram(base)).toContain('up to 2 times')
  })
})
