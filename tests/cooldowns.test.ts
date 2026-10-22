import { describe, expect, it } from 'vitest'
import { type AccountFacts, type CooldownSettings, evaluate, type GigFacts, rankCandidates, reasonLine, readiness, type WorkRow, workerBlockReason } from '@/features/accounts/cooldowns'

const S: CooldownSettings = {
  sameCommunityDays: 7,
  sameClientMaxPerWeek: 2,
  sameClientMinGapDays: 3,
  anyClientGapDays: 5,
  perDayLimit: 1,
  maxOpenAssignments: 2,
  afterRejectionDays: 3,
}
// Wed 22 Oct 2026, 15:30 IST
const now = new Date('2026-10-22T10:00:00Z')
const daysAgo = (n: number, from = now) => new Date(from.getTime() - n * 86_400_000)

const gig: GigFacts = { id: 'g1', platform: 'reddit', community: 'india', clientTagId: 'acme', minKarma: 0, minAccountAgeMonths: 0, allowedStates: [] }
const acc = (id: string, over: Partial<AccountFacts> = {}): AccountFacts => ({
  id,
  platform: 'reddit',
  handle: id,
  createdOn: new Date('2024-01-01T00:00:00Z'),
  karma: 1000,
  standing: 'active',
  ...over,
})
let n = 0
const work = (over: Partial<WorkRow>): WorkRow => ({
  id: `w${n++}`,
  gigId: `old${n}`,
  workerId: 'p1',
  accountId: 'a1',
  clientTagId: null,
  community: null,
  status: 'approved',
  at: daysAgo(30),
  posted: true,
  decidedAt: daysAgo(29),
  ...over,
})
const run = (accounts: AccountFacts[], history: WorkRow[], g = gig) => evaluate({ gig: g, worker: { state: 'Karnataka' }, accounts, history, settings: S, now })

describe('person-scoped rules (R14, R16)', () => {
  it('blocks every account of a person who posted in the same community this week', () => {
    const evals = run([acc('a1'), acc('a2'), acc('a3')], [work({ accountId: 'a2', community: 'india', at: daysAgo(3) })])
    for (const e of evals) expect(e.soft.map((b) => b.rule)).toContain('same_community')
    expect(evals.every((e) => !e.ok)).toBe(true)
  })
  it('counts work from lost accounts', () => {
    const evals = run([acc('a1')], [work({ accountId: 'lost-one', community: 'india', at: daysAgo(2) })])
    expect(evals[0]?.soft.map((b) => b.rule)).toContain('same_community')
  })
  it('limits one piece per Indian calendar day', () => {
    // 01:00 IST today = 19:30 UTC yesterday — still "today" in India.
    const evals = run([acc('a1')], [work({ accountId: 'zz', at: new Date('2026-10-21T19:30:00Z') })])
    expect(evals[0]?.soft.map((b) => b.rule)).toContain('per_day')
    const late = run([acc('a1')], [work({ accountId: 'zz', at: new Date('2026-10-21T18:00:00Z') })]) // 23:30 IST yesterday
    expect(late[0]?.soft.map((b) => b.rule)).not.toContain('per_day')
  })
  it('caps open assignments and pauses after a rejection', () => {
    const evals = run(
      [acc('a1')],
      [
        work({ accountId: 'x', status: 'claimed', posted: false, at: daysAgo(9) }),
        work({ accountId: 'y', status: 'live_check', at: daysAgo(10) }),
        work({ accountId: 'z', status: 'rejected', at: daysAgo(12), decidedAt: daysAgo(1) }),
      ],
    )
    const rules = evals[0]?.soft.map((b) => b.rule)
    expect(rules).toContain('open_assignments')
    expect(rules).toContain('after_rejection')
  })
  it('counts work from submission, not approval (R18)', () => {
    // Posted 2 days ago in r/india, approved today: the post already exists on Reddit.
    const evals = run([acc('a1')], [work({ accountId: 'a9', community: 'india', at: daysAgo(2), decidedAt: now })])
    expect(evals[0]?.soft.map((b) => b.rule)).toContain('same_community')
  })
  it('ignores assigned work that never got posted', () => {
    const evals = run([acc('a1')], [work({ community: 'india', status: 'expired', posted: false, at: daysAgo(1) })])
    expect(evals[0]?.ok).toBe(true)
  })
})

describe('account-scoped rules (R15)', () => {
  it('enforces the any-client gap only on the account that worked', () => {
    const evals = run([acc('a1'), acc('a2')], [work({ accountId: 'a1', at: daysAgo(4) })])
    expect(evals.find((e) => e.accountId === 'a1')?.soft.map((b) => b.rule)).toEqual(['any_client'])
    expect(evals.find((e) => e.accountId === 'a2')?.ok).toBe(true)
  })
  it('uses a rolling week, not Monday–Sunday (R17)', () => {
    const relaxed = { ...S, anyClientGapDays: 0, sameClientMinGapDays: 0 }
    const history = [work({ clientTagId: 'acme', at: daysAgo(6) }), work({ clientTagId: 'acme', at: daysAgo(5) })]
    const e = evaluate({ gig, worker: { state: 'Karnataka' }, accounts: [acc('a1')], history, settings: relaxed, now })[0]
    const block = e?.soft.find((b) => b.rule === 'same_client')
    expect(block).toBeTruthy()
    // Frees up when the 6-day-old post rolls out of the window: tomorrow.
    expect(block?.unlockAt?.toISOString()).toBe(daysAgo(-1).toISOString())
  })
  it('keeps a minimum gap between two pieces for the same client', () => {
    const e = run([acc('a1')], [work({ clientTagId: 'acme', at: daysAgo(10) }), work({ clientTagId: 'acme', at: daysAgo(2) })])[0]
    expect(e?.soft.map((b) => b.rule)).toContain('same_client')
  })
})

describe('hard requirements', () => {
  it('keeps warm-up, banned and wrong-platform accounts out', () => {
    const evals = run([acc('young', { createdOn: daysAgo(10) }), acc('gone', { standing: 'banned' }), acc('tw', { platform: 'x' })], [])
    expect(evals.map((e) => e.hard[0]?.rule)).toEqual(['warmup', 'standing', 'platform'])
  })
  it('checks min karma and age per account', () => {
    const g = { ...gig, minKarma: 500, minAccountAgeMonths: 6 }
    const evals = run([acc('low', { karma: 100 }), acc('new', { createdOn: daysAgo(60) }), acc('ok')], [], g)
    expect(evals.map((e) => e.ok)).toEqual([false, false, true])
  })
})

describe('what workers are told (R19)', () => {
  it('names the rule and the unlock date, without the client', () => {
    const evals = run([acc('a1')], [work({ clientTagId: 'acme', community: 'india', at: new Date('2026-10-18T06:00:00Z') })])
    const reason = workerBlockReason(evals, now)
    expect(reason?.rule).toBe('same_community')
    expect(reason?.message).toMatch(/Available in 3 days: you posted in r\/india on 18 Oct/)
    expect(reason?.message).not.toMatch(/acme/)
  })
  it('is null when any account can take it', () => {
    expect(workerBlockReason(run([acc('a1'), acc('a2')], [work({ accountId: 'a1', at: daysAgo(1) })]), now)).toBeNull()
  })
})

describe('roster readiness', () => {
  it('reports cooling down until the last gap lifts', () => {
    const r = readiness('a1', [work({ at: daysAgo(2) })], S, now)
    expect(r.cooling).toBe(true)
    expect(r.until?.toISOString()).toBe(daysAgo(-3).toISOString())
  })
})

describe('ranking (R9)', () => {
  it('puts clean, fresh, senior accounts first and explains them', () => {
    const history = [work({ accountId: 'busy', at: daysAgo(4) }), work({ accountId: 'used', at: daysAgo(20), community: 'india' })]
    const accounts = [acc('busy'), acc('used'), acc('fresh', { createdOn: daysAgo(400) }), acc('junior', { createdOn: daysAgo(40) })]
    const evals = run(accounts, history)
    const cands = evals.map((e) => ({ accountId: e.accountId, handle: e.accountId, evaluation: e, community: 'india' }))
    const ranked = rankCandidates(cands).map((c) => c.accountId)
    // busy is flagged (any-client gap); among clean ones: never-used before used, then senior before junior.
    expect(ranked).toEqual(['fresh', 'junior', 'used', 'busy'])
    const fresh = cands.find((c) => c.accountId === 'fresh')
    expect(fresh && reasonLine(fresh, now)).toMatch(/^u\/fresh · L4 · no client posts yet · posted in r\/india 20 days ago$/)
  })
})

describe('worker-facing payloads (R44)', async () => {
  const { workerSafeGig, workerSafeSubmission } = await import('@/features/submissions/worker-safe')
  it('drop client and staff-only fields', () => {
    const sub = workerSafeSubmission({ id: 's', clientTagId: 'acme', selectedBy: 'admin', overrideReason: 'x', onBehalfBy: 'admin', decidedBy: 'a', proofUrl: 'u' })
    expect(Object.keys(sub)).toEqual(['id', 'proofUrl'])
    expect(Object.keys(workerSafeGig({ id: 'g', clientTagId: 'acme', createdBy: 'a', title: 't' }))).toEqual(['id', 'title'])
  })
})
