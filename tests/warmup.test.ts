import { describe, expect, it } from 'vitest'
import { matchesAudience } from '@/features/warmup/rules'

const now = new Date('2026-10-22T10:00:00Z')
const acc = (karma: number, ageDays: number, standing = 'active') => ({
  platform: 'reddit',
  karma,
  standing,
  createdOn: new Date(now.getTime() - ageDays * 86_400_000),
})

describe('warm-up audiences (R55)', () => {
  it('targets everyone, chosen people, or a filter', () => {
    expect(matchesAudience({ type: 'all' }, 'w1', [], now)).toBe(true)
    expect(matchesAudience({ type: 'workers', workerIds: ['w1'] }, 'w1', [], now)).toBe(true)
    expect(matchesAudience({ type: 'workers', workerIds: ['w2'] }, 'w1', [], now)).toBe(false)
  })
  it('matches “any account under 300 karma”', () => {
    expect(matchesAudience({ type: 'filter', maxKarma: 300 }, 'w1', [acc(5000, 400), acc(120, 20)], now)).toBe(true)
    expect(matchesAudience({ type: 'filter', maxKarma: 300 }, 'w1', [acc(5000, 400)], now)).toBe(false)
  })
  it('combines limits on the same account and skips lost accounts', () => {
    expect(matchesAudience({ type: 'filter', maxKarma: 300, maxAgeDays: 30 }, 'w1', [acc(100, 90), acc(900, 10)], now)).toBe(false)
    expect(matchesAudience({ type: 'filter', maxKarma: 300 }, 'w1', [acc(10, 5, 'banned')], now)).toBe(false)
  })
})
