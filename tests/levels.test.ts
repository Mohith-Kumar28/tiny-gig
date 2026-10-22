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
