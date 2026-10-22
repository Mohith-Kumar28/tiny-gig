import type { gig } from '@/db/schema'
import { type Level, levelFor, nextLevel, PAID_LEVELS, type PaidLevel } from '@/features/accounts/rules'
import type { AppSettings } from '@/features/settings/schemas'

type GigRow = Pick<typeof gig.$inferSelect, 'payoutAmount' | 'payMode' | 'levelRateOverrides' | 'taskType' | 'platform'>
type RateSettings = Pick<AppSettings, 'levelRates' | 'upvoteRate'>

/** Level pricing applies to Reddit posts and comments on level-priced gigs; upvotes are flat by design. */
export function usesLevels(g: GigRow) {
  return g.payMode === 'levels' && g.platform === 'reddit' && (g.taskType === 'post' || g.taskType === 'comment' || g.taskType === 'upvote')
}

/** The rate for one level. Gig overrides win over the settings table (R23). */
export function levelRate(g: GigRow, level: PaidLevel, s: RateSettings): number {
  if (g.taskType === 'upvote') return s.upvoteRate
  const kind = g.taskType === 'comment' ? 'comment' : 'post'
  return g.levelRateOverrides?.[level] ?? s.levelRates[kind][level]
}

/**
 * The amount locked onto an assignment at selection (R22) — from the specific account doing
 * the work (R21), never the worker's oldest one. Warm-up accounts can't be assigned at all.
 */
export function rateFor(g: GigRow, level: Level | null, _platform: string, s: RateSettings): number {
  if (!usesLevels(g)) return g.payoutAmount
  if (!level || level === 'warmup') return 0
  return levelRate(g, level, s)
}

/** What a gig can pay, for public cards (R28) and admin exposure (R30). */
export function rateRange(g: GigRow, s: RateSettings): { min: number; max: number } {
  if (!usesLevels(g)) return { min: g.payoutAmount, max: g.payoutAmount }
  const rates = PAID_LEVELS.map((l) => levelRate(g, l, s))
  return { min: Math.min(...rates), max: Math.max(...rates) }
}

/** "₹80 with u/foo · ₹100 once this account is 6 months old" (R29). */
export function ratePreview(g: GigRow, createdOn: Date | null, s: RateSettings, now = new Date()) {
  const level = levelFor(createdOn, now)
  const rate = rateFor(g, level, 'reddit', s)
  if (!usesLevels(g) || g.taskType === 'upvote') return { rate, next: null }
  const nl = nextLevel(createdOn, now)
  if (!nl) return { rate, next: null }
  const nextRate = levelRate(g, nl.level, s)
  return { rate, next: nextRate > rate ? { level: nl.level, rate: nextRate, at: nl.at } : null }
}
