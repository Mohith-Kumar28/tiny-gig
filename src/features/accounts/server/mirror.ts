import { and, asc, eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { socialAccount, workerProfile } from '@/db/schema'
import { accountAgeDays } from '../rules'

/**
 * worker_profile still carries one Reddit username/karma/age (legacy, NOT NULL columns).
 * Keep it mirroring the worker's first Reddit account so older screens and search stay right.
 */
export async function syncProfileMirror(db: Db, workerId: string) {
  const primary = await db
    .select()
    .from(socialAccount)
    .where(and(eq(socialAccount.workerId, workerId), eq(socialAccount.platform, 'reddit')))
    .orderBy(asc(socialAccount.createdAt))
    .get()
  if (!primary) return
  const days = accountAgeDays(primary.createdOn)
  await db
    .update(workerProfile)
    .set({
      redditUsername: primary.handle,
      redditUrl: primary.url,
      karma: primary.karma ?? 0,
      accountAgeMonths: days == null ? 0 : Math.floor(days / 30.44),
    })
    .where(eq(workerProfile.userId, workerId))
}
