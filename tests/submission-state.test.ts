import { describe, expect, it } from 'vitest'
import { canWithdraw, reviewTransition, workerSubmitTransition } from '@/features/submissions/state'

const submittedAt = new Date('2026-10-01T10:00:00Z')

describe('reviewTransition', () => {
  it('moves to live_check when the gig has a live hold', () => {
    const t = reviewTransition('submitted', 'approve', { liveHoldHours: 24, submittedAt })
    expect(t).toMatchObject({ ok: true, status: 'live_check', final: false })
    if (t.ok) expect(t.liveCheckAt?.toISOString()).toBe('2026-10-02T10:00:00.000Z')
  })

  it('approves directly without a live hold, or when skipping it', () => {
    expect(reviewTransition('submitted', 'approve', { liveHoldHours: 0, submittedAt })).toMatchObject({ status: 'approved', final: true })
    expect(reviewTransition('resubmitted', 'approve', { liveHoldHours: 24, submittedAt, skipLiveCheck: true })).toMatchObject({
      status: 'approved',
    })
  })

  it('final-approves from live_check', () => {
    expect(reviewTransition('live_check', 'approve', { liveHoldHours: 24, submittedAt })).toMatchObject({ status: 'approved', final: true })
  })

  it('requests changes and rejects', () => {
    expect(reviewTransition('submitted', 'request_changes', { liveHoldHours: 24, submittedAt })).toMatchObject({ status: 'changes_requested' })
    expect(reviewTransition('live_check', 'reject', { liveHoldHours: 24, submittedAt })).toMatchObject({ status: 'rejected', final: true })
    expect(reviewTransition('changes_requested', 'reject', { liveHoldHours: 24, submittedAt })).toMatchObject({ status: 'rejected' })
  })

  it('refuses invalid transitions', () => {
    expect(reviewTransition('claimed', 'approve', { liveHoldHours: 0, submittedAt }).ok).toBe(false)
    expect(reviewTransition('approved', 'reject', { liveHoldHours: 0, submittedAt }).ok).toBe(false)
    expect(reviewTransition('changes_requested', 'request_changes', { liveHoldHours: 0, submittedAt }).ok).toBe(false)
  })
})

describe('worker transitions', () => {
  it('submits and resubmits', () => {
    expect(workerSubmitTransition('claimed')).toMatchObject({ status: 'submitted' })
    expect(workerSubmitTransition('changes_requested')).toMatchObject({ status: 'resubmitted' })
    expect(workerSubmitTransition('submitted').ok).toBe(false)
  })
  it('only withdraws open work', () => {
    expect(canWithdraw('claimed')).toBe(true)
    expect(canWithdraw('live_check')).toBe(false)
  })
})

describe('two-step proof (§7)', async () => {
  const { insightsTransition } = await import('@/features/submissions/state')
  const now = new Date('2026-10-22T10:00:00Z')
  it('puts a submitted link on hold for the live period', () => {
    const t = workerSubmitTransition('claimed', { twoStep: true, liveHoldHours: 24, now })
    expect(t).toMatchObject({ ok: true, status: 'on_hold' })
    if (t.ok) expect(t.liveCheckAt?.toISOString()).toBe('2026-10-23T10:00:00.000Z')
    expect(workerSubmitTransition('changes_requested', { twoStep: true, liveHoldHours: 24, now })).toMatchObject({ status: 'on_hold' })
    expect(workerSubmitTransition('claimed', { twoStep: true, liveHoldHours: 0, now })).toMatchObject({ status: 'in_review' })
  })
  it('only takes insights after the hold', () => {
    expect(insightsTransition('on_hold', new Date('2026-10-22T11:00:00Z'), now).ok).toBe(false)
    expect(insightsTransition('on_hold', new Date('2026-10-22T09:00:00Z'), now)).toMatchObject({ status: 'in_review' })
    expect(insightsTransition('claimed', null, now).ok).toBe(false)
  })
  it('approves only once insights are in; can change or reject during the hold', () => {
    const o = { liveHoldHours: 24, submittedAt: now }
    expect(reviewTransition('on_hold', 'approve', o).ok).toBe(false)
    expect(reviewTransition('in_review', 'approve', o)).toMatchObject({ status: 'approved', final: true })
    expect(reviewTransition('on_hold', 'request_changes', o)).toMatchObject({ status: 'changes_requested' })
    expect(reviewTransition('on_hold', 'reject', o)).toMatchObject({ status: 'rejected' })
  })
  it('keeps legacy work on the old path', () => {
    expect(workerSubmitTransition('claimed')).toMatchObject({ status: 'submitted' })
  })
})
