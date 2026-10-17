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
