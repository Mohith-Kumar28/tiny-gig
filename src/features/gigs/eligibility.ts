import { formatNumber } from '@/lib/format'

type GigRequirements = {
  minKarma: number
  minAccountAgeMonths: number
  allowedStates: string[]
  status: string
  totalSlots: number
  claimedSlots: number
  startsAt: Date | null
  endsAt: Date | null
}
type WorkerFacts = { karma: number; accountAgeMonths: number; state: string }

/** Returns null when the worker can claim, or the human reason they can't. */
export function ineligibleReason(gig: GigRequirements, worker: WorkerFacts, now = new Date()): string | null {
  if (gig.status !== 'live') return 'This gig is not open right now'
  if (gig.startsAt && now < gig.startsAt) return 'Opens soon'
  if (gig.endsAt && now > gig.endsAt) return 'This gig has ended'
  if (gig.claimedSlots >= gig.totalSlots) return 'All slots are taken'
  if (worker.karma < gig.minKarma) return `Needs ${formatNumber(gig.minKarma)}+ karma`
  if (worker.accountAgeMonths < gig.minAccountAgeMonths)
    return `Needs a ${gig.minAccountAgeMonths}+ month old account`
  if (gig.allowedStates.length && !gig.allowedStates.includes(worker.state)) return 'Not available in your state'
  return null
}
