import type { gig } from '@/db/schema'
import type { Level } from '@/features/accounts/rules'

type GigRow = Pick<typeof gig.$inferSelect, 'payoutAmount'>

/** The amount locked onto an assignment. Level-based pay arrives with payout levels (§6). */
export function rateFor(g: GigRow, _level: Level | null, _platform: string, _settings: unknown): number {
  return g.payoutAmount
}
