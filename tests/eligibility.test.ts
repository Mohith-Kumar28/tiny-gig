import { describe, expect, it } from 'vitest'
import { gigClosedReason } from '@/features/gigs/eligibility'

const gig = { status: 'live', totalSlots: 5, claimedSlots: 2, startsAt: null, endsAt: null }

describe('gigClosedReason', () => {
  it('is open when live with slots left', () => expect(gigClosedReason(gig)).toBeNull())
  it('explains why a gig is closed', () => {
    expect(gigClosedReason({ ...gig, claimedSlots: 5 })).toMatch(/slots/)
    expect(gigClosedReason({ ...gig, status: 'paused' })).toMatch(/not open/)
    expect(gigClosedReason({ ...gig, startsAt: new Date(Date.now() + 3_600_000) })).toBe('Opens soon')
    expect(gigClosedReason({ ...gig, endsAt: new Date(Date.now() - 1000) })).toMatch(/ended/)
  })
})
