import { z } from 'zod'
import { LEVEL_LABELS, LEVELS, type Level } from '@/features/accounts/rules'

/** Who a broadcast goes to. Always approved workers, narrowed by level and state, or hand-picked. */
export const broadcastAudienceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('all') }),
  z.object({
    type: z.literal('filter'),
    levels: z.array(z.enum(LEVELS)).max(LEVELS.length),
    states: z.array(z.string().max(80)).max(40),
  }),
  z.object({ type: z.literal('workers'), workerIds: z.array(z.string()).min(1).max(500) }),
])
export type BroadcastAudience = z.infer<typeof broadcastAudienceSchema>

export type AudienceCandidate = { userId: string; state: string; level: Level }

export function matchesBroadcastAudience(audience: BroadcastAudience, w: AudienceCandidate) {
  switch (audience.type) {
    case 'all':
      return true
    case 'workers':
      return audience.workerIds.includes(w.userId)
    case 'filter':
      return (
        (!audience.levels.length || audience.levels.includes(w.level)) &&
        (!audience.states.length || audience.states.includes(w.state))
      )
  }
}

export function describeBroadcastAudience(a: BroadcastAudience) {
  switch (a.type) {
    case 'all':
      return 'All approved workers'
    case 'workers':
      return `${a.workerIds.length} chosen worker${a.workerIds.length === 1 ? '' : 's'}`
    case 'filter': {
      const parts = [
        a.levels.length ? a.levels.map((l) => LEVEL_LABELS[l]).join(', ') : null,
        a.states.length ? (a.states.length > 2 ? `${a.states.length} states` : a.states.join(', ')) : null,
      ].filter(Boolean)
      return parts.length ? parts.join(' · ') : 'All approved workers'
    }
  }
}
