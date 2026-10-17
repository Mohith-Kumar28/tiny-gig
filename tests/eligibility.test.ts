import { describe, expect, it } from 'vitest'
import { ineligibleReason } from '@/features/gigs/eligibility'

const gig = {
  minKarma: 1000,
  minAccountAgeMonths: 6,
  allowedStates: ['Karnataka'],
  status: 'live',
  totalSlots: 5,
  claimedSlots: 2,
  startsAt: null,
  endsAt: null,
}
const worker = { karma: 5000, accountAgeMonths: 12, state: 'Karnataka' }

describe('ineligibleReason', () => {
  it('allows eligible workers', () => expect(ineligibleReason(gig, worker)).toBeNull())
  it('blocks on each requirement', () => {
    expect(ineligibleReason({ ...gig, claimedSlots: 5 }, worker)).toMatch(/slots/)
    expect(ineligibleReason(gig, { ...worker, karma: 10 })).toMatch(/karma/)
    expect(ineligibleReason(gig, { ...worker, accountAgeMonths: 1 })).toMatch(/month/)
    expect(ineligibleReason(gig, { ...worker, state: 'Goa' })).toMatch(/state/)
    expect(ineligibleReason({ ...gig, status: 'paused' }, worker)).toMatch(/not open/)
  })
})
