import { describe, expect, it } from 'vitest'
import { istDayKey, levelFor, nextIstMidnight, nextLevel, normalizeCommunity, parseHandle } from '@/features/accounts/rules'

const created = new Date('2026-01-15T00:00:00Z')
const at = (iso: string) => new Date(iso)

describe('levelFor', () => {
  it('is warm-up for the first two weeks', () => {
    expect(levelFor(created, at('2026-01-28T23:59:00Z'))).toBe('warmup')
    expect(levelFor(created, at('2026-01-29T00:00:00Z'))).toBe('L1')
  })
  it('climbs at 3, 6 and 12 calendar months', () => {
    expect(levelFor(created, at('2026-04-14T23:00:00Z'))).toBe('L1')
    expect(levelFor(created, at('2026-04-15T00:00:00Z'))).toBe('L2')
    expect(levelFor(created, at('2026-07-15T00:00:00Z'))).toBe('L3')
    expect(levelFor(created, at('2027-01-14T00:00:00Z'))).toBe('L3')
    expect(levelFor(created, at('2027-01-15T00:00:00Z'))).toBe('L4')
  })
  it('is unknown without a creation date', () => {
    expect(levelFor(null)).toBeNull()
  })
  it('reports the next level and its date', () => {
    expect(nextLevel(created, at('2026-06-01T00:00:00Z'))).toEqual({ level: 'L3', at: at('2026-07-15T00:00:00Z') })
    expect(nextLevel(created, at('2027-02-01T00:00:00Z'))).toBeNull()
  })
})

describe('IST days', () => {
  it('rolls over at midnight India time, not UTC', () => {
    // 18:29 UTC = 23:59 IST; 18:30 UTC = 00:00 IST next day.
    expect(istDayKey(at('2026-10-20T18:29:00Z'))).toBe('2026-10-20')
    expect(istDayKey(at('2026-10-20T18:30:00Z'))).toBe('2026-10-21')
    expect(nextIstMidnight(at('2026-10-20T10:00:00Z')).toISOString()).toBe('2026-10-20T18:30:00.000Z')
  })
})

describe('parsing', () => {
  it('normalizes communities', () => {
    expect(normalizeCommunity('r/DevelopersIndia/')).toBe('developersindia')
    expect(normalizeCommunity('https://www.reddit.com/r/india/comments/x')).toBe('india')
    expect(normalizeCommunity('  ')).toBeNull()
  })
  it('extracts handles', () => {
    expect(parseHandle('reddit', 'https://www.reddit.com/user/Foo_Bar/')).toBe('foo_bar')
    expect(parseHandle('reddit', 'u/foo_bar')).toBe('foo_bar')
    expect(parseHandle('x', 'https://x.com/@Someone?s=1')).toBe('someone')
    expect(parseHandle('linkedin', 'https://www.linkedin.com/in/jane-doe/')).toBe('jane-doe')
  })
})

describe('rates (§6)', async () => {
  const { rateFor, rateRange, ratePreview } = await import('@/features/opportunities/server/rates')
  const s = { levelRates: { post: { L1: 6000, L2: 7000, L3: 8500, L4: 10000 }, comment: { L1: 2000, L2: 2500, L3: 3000, L4: 4000 } }, upvoteRate: 500 }
  const g = { payoutAmount: 5000, payMode: 'levels' as const, levelRateOverrides: null, taskType: 'post' as const, platform: 'reddit' as const }
  it('prices by the account’s level, with per-gig overrides', () => {
    expect(rateFor(g, 'L3', 'reddit', s)).toBe(8500)
    expect(rateFor({ ...g, levelRateOverrides: { L3: 12000 } }, 'L3', 'reddit', s)).toBe(12000)
    expect(rateFor({ ...g, taskType: 'upvote' }, 'L1', 'reddit', s)).toBe(500)
    expect(rateFor({ ...g, payMode: 'flat' }, 'L4', 'reddit', s)).toBe(5000)
  })
  it('shows a range publicly', () => expect(rateRange(g, s)).toEqual({ min: 6000, max: 10000 }))
  it('locks the rate at selection: 5 months stays L2 money even after the account turns 6 months', () => {
    const createdOn = new Date('2026-01-15T00:00:00Z')
    const atSelection = rateFor(g, levelFor(createdOn, new Date('2026-06-20T00:00:00Z')), 'reddit', s)
    expect(atSelection).toBe(7000)
    // A month later the account is L3, but the stored amount is what gets paid — nothing recomputes it.
    expect(rateFor(g, levelFor(createdOn, new Date('2026-07-20T00:00:00Z')), 'reddit', s)).toBe(8500)
  })
  it('tells the worker what the next level pays', () => {
    const p = ratePreview(g, new Date('2026-01-15T00:00:00Z'), s, new Date('2026-06-01T00:00:00Z'))
    expect(p.rate).toBe(7000)
    expect(p.next).toMatchObject({ level: 'L3', rate: 8500 })
  })
})
