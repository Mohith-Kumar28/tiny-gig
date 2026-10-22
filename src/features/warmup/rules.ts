import type { WarmupAudience } from '@/db/schema/accounts'
import { accountAgeDays } from '@/features/accounts/rules'

type Acc = { platform: string; createdOn: Date | null; karma: number | null; standing: string }

/** Who a warm-up item is for (R55): everyone, chosen people, or "anyone with an account under N karma". */
export function matchesAudience(audience: WarmupAudience, workerId: string, accounts: Acc[], now = new Date()) {
  switch (audience.type) {
    case 'all':
      return true
    case 'workers':
      return audience.workerIds.includes(workerId)
    case 'filter':
      return accounts.some((a) => {
        if (a.platform !== 'reddit' || a.standing === 'banned' || a.standing === 'lost' || a.standing === 'retired') return false
        if (audience.maxKarma != null && (a.karma ?? 0) > audience.maxKarma) return false
        if (audience.maxAgeDays != null) {
          const age = accountAgeDays(a.createdOn, now)
          if (age == null || age > audience.maxAgeDays) return false
        }
        return true
      })
  }
}

export function describeAudience(a: WarmupAudience) {
  switch (a.type) {
    case 'all':
      return 'Everyone'
    case 'workers':
      return `${a.workerIds.length} chosen worker${a.workerIds.length === 1 ? '' : 's'}`
    case 'filter': {
      const parts = [
        a.maxKarma != null ? `under ${a.maxKarma.toLocaleString('en-IN')} karma` : null,
        a.maxAgeDays != null ? `under ${a.maxAgeDays} days old` : null,
      ].filter(Boolean)
      return parts.length ? `Accounts ${parts.join(' and ')}` : 'Everyone with a Reddit account'
    }
  }
}
