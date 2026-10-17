import type { ReferralTrigger } from '@/db/schema/enums'
import { formatMoney } from '@/lib/format'

export type ProgramRule = {
  trigger: ReferralTrigger
  triggerValue: number
  threshold: number
  referrerReward: number
  refereeReward: number
  repeatMode: 'once' | 'every'
  maxRewardsPerReferrer: number | null
  qualifyWithinDays: number | null
  startsAt: Date | null
  endsAt: Date | null
  active: boolean
}

export type ReferralProgress = {
  attributedAt: Date
  approvedAt: Date | null
  firstGigApprovedAt: Date | null
  gigsApproved: number
  earned: number
  flagged: boolean
}

export const TRIGGER_LABELS: Record<ReferralTrigger, string> = {
  signed_up: 'Signs up and applies',
  approved: 'Gets approved',
  first_gig_approved: 'Gets their first gig approved',
  gigs_approved: 'Gets N gigs approved',
  earned_at_least: 'Earns at least ₹X',
}

export function isProgramRunning(p: Pick<ProgramRule, 'active' | 'startsAt' | 'endsAt'>, now = new Date()) {
  if (!p.active) return false
  if (p.startsAt && now < p.startsAt) return false
  if (p.endsAt && now > p.endsAt) return false
  return true
}

/** When (if ever) the referee reached the program milestone. */
export function milestoneReachedAt(rule: ProgramRule, r: ReferralProgress, now = new Date()): Date | null {
  switch (rule.trigger) {
    case 'signed_up':
      return r.attributedAt
    case 'approved':
      return r.approvedAt
    case 'first_gig_approved':
      return r.firstGigApprovedAt
    case 'gigs_approved':
      return r.gigsApproved >= Math.max(1, rule.triggerValue) ? now : null
    case 'earned_at_least':
      return r.earned >= rule.triggerValue ? now : null
  }
}

export function refereeQualifies(rule: ProgramRule, r: ReferralProgress, now = new Date()) {
  if (r.flagged) return false
  if (rule.startsAt && r.attributedAt < rule.startsAt) return false
  if (rule.endsAt && r.attributedAt > rule.endsAt) return false
  const at = milestoneReachedAt(rule, r, now)
  if (!at) return false
  if (rule.qualifyWithinDays != null) {
    const limit = r.attributedAt.getTime() + rule.qualifyWithinDays * 86_400_000
    if (at.getTime() > limit) return false
  }
  return true
}

/** Number of referrer reward tiers earned for a count of qualified referees. */
export function referrerTiersEarned(rule: Pick<ProgramRule, 'threshold' | 'repeatMode' | 'maxRewardsPerReferrer'>, qualified: number) {
  const threshold = Math.max(1, rule.threshold)
  const raw = rule.repeatMode === 'once' ? (qualified >= threshold ? 1 : 0) : Math.floor(qualified / threshold)
  return rule.maxRewardsPerReferrer != null ? Math.min(raw, rule.maxRewardsPerReferrer) : raw
}

/** Progress toward the next referrer reward, for progress bars. */
export function nextTierProgress(rule: ProgramRule, qualified: number) {
  const threshold = Math.max(1, rule.threshold)
  const earned = referrerTiersEarned(rule, qualified)
  const capped =
    (rule.repeatMode === 'once' && earned >= 1) ||
    (rule.maxRewardsPerReferrer != null && earned >= rule.maxRewardsPerReferrer)
  if (capped) return { earned, current: threshold, target: threshold, done: true }
  return { earned, current: qualified - earned * threshold, target: threshold, done: false }
}

function milestonePhrase(rule: Pick<ProgramRule, 'trigger' | 'triggerValue'>, plural: boolean) {
  const s = (one: string, many: string) => (plural ? many : one)
  switch (rule.trigger) {
    case 'signed_up':
      return s('signs up', 'sign up')
    case 'approved':
      return s('gets approved', 'get approved')
    case 'first_gig_approved':
      return s('gets their first gig approved', 'get their first gig approved')
    case 'gigs_approved':
      return `${s('gets', 'get')} ${rule.triggerValue} gig${rule.triggerValue === 1 ? '' : 's'} approved`
    case 'earned_at_least':
      return `${s('earns', 'earn')} ${formatMoney(rule.triggerValue)}`
  }
}

/** Plain-English summary used in the builder preview and worker page. */
export function describeProgram(rule: ProgramRule) {
  const t = Math.max(1, rule.threshold)
  const who = t === 1 ? 'a referred worker' : `${t} referred workers`
  const parts: string[] = [`When ${who} ${milestonePhrase(rule, t !== 1)}`]
  const rewards: string[] = []
  if (rule.referrerReward > 0) rewards.push(`the referrer earns ${formatMoney(rule.referrerReward)}`)
  if (rule.refereeReward > 0)
    rewards.push(`${t === 1 ? 'the referred worker' : 'each referred worker'} earns ${formatMoney(rule.refereeReward)}`)
  parts.push(rewards.length ? rewards.join(' and ') : 'no reward is set yet')
  let sentence = `${parts.join(', ')}.`
  if (rule.repeatMode === 'every' && rule.referrerReward > 0) {
    sentence += ` Repeats for every ${t === 1 ? '' : `${t} `}more`
    sentence += rule.maxRewardsPerReferrer != null ? `, up to ${rule.maxRewardsPerReferrer} times.` : ', no limit.'
  }
  if (rule.qualifyWithinDays != null)
    sentence += ` The referred worker must qualify within ${rule.qualifyWithinDays} days of joining.`
  return sentence
}
