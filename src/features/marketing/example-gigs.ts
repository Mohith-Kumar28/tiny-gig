import type { Platform } from './platform-mark'

/** Illustrative gigs only. Real gigs, communities and rates change daily. */
export type ExampleGig = {
  platform: Platform
  where: string
  task: string
  payout: number
  requirement?: string
  hold?: string
}

export const EXAMPLE_GIGS: ExampleGig[] = [
  { platform: 'reddit', where: 'r/IndianGaming', task: 'Comment on a product thread', payout: 40, requirement: '100+ karma', hold: '24h live' },
  { platform: 'reddit', where: 'r/developersIndia', task: 'Write a post sharing your setup', payout: 120, requirement: '6+ month account', hold: '24h live' },
  { platform: 'reddit', where: 'r/bangalore', task: 'Reply to a question about local food spots', payout: 30, requirement: 'Karnataka only' },
  { platform: 'x', where: 'X', task: 'Quote-post a launch with your honest take', payout: 25 },
  { platform: 'linkedin', where: 'LinkedIn', task: 'Comment on a hiring post with a useful tip', payout: 35 },
]

export function formatInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}
