type GigWindow = {
  status: string
  totalSlots: number
  claimedSlots: number
  startsAt: Date | null
  endsAt: Date | null
}

/**
 * Gig-level availability — is it open at all? Per-account requirements and the cooldown
 * rules live in `features/accounts/cooldowns.ts`.
 */
export function gigClosedReason(gig: GigWindow, now = new Date()): string | null {
  if (gig.status !== 'live') return 'This gig is not open right now'
  if (gig.startsAt && now < gig.startsAt) return 'Opens soon'
  if (gig.endsAt && now > gig.endsAt) return 'This gig has ended'
  if (gig.claimedSlots >= gig.totalSlots) return 'All slots are taken'
  return null
}
