import { and, eq, inArray } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { inChunks } from '@/db/in-chunks'
import { socialAccount, workerProfile } from '@/db/schema'
import { LEVEL_LABELS, type Level, workerLevel } from '@/features/accounts/rules'
import type { AppSettings } from '@/features/settings/schemas'
import { type BroadcastAudience, matchesBroadcastAudience } from '../audience'

export async function workerLevels(db: Db, userIds: string[], now = new Date()) {
  const accounts = await inChunks(db, userIds, (ids) =>
    db
      .select({
        workerId: socialAccount.workerId,
        platform: socialAccount.platform,
        createdOn: socialAccount.createdOn,
        standing: socialAccount.standing,
      })
      .from(socialAccount)
      .where(and(inArray(socialAccount.workerId, ids), eq(socialAccount.platform, 'reddit'))),
  )
  const byWorker = new Map<string, typeof accounts>()
  for (const a of accounts) byWorker.set(a.workerId, [...(byWorker.get(a.workerId) ?? []), a])
  return new Map(userIds.map((id) => [id, workerLevel(byWorker.get(id) ?? [], now)] as const))
}

export function whatsappGroupFor(settings: AppSettings, level: Level) {
  const url = settings.whatsappGroups[level]
  return url ? { level, label: LEVEL_LABELS[level], url } : null
}

/** Approved workers the audience selects, each with their current level. */
export async function resolveAudience(db: Db, audience: BroadcastAudience) {
  const approved = eq(workerProfile.status, 'approved')
  const cols = { userId: workerProfile.userId, email: workerProfile.email, state: workerProfile.state }
  const workers =
    audience.type === 'workers'
      ? await inChunks(db, audience.workerIds, (ids) =>
          db
            .select(cols)
            .from(workerProfile)
            .where(and(approved, inArray(workerProfile.userId, ids))),
        )
      : await db.select(cols).from(workerProfile).where(approved)
  const levels = await workerLevels(
    db,
    workers.map((w) => w.userId),
  )
  return workers
    .map((w) => ({ ...w, level: levels.get(w.userId) ?? ('warmup' as const) }))
    .filter((w) => matchesBroadcastAudience(audience, w))
}
