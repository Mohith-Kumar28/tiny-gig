import { inArray } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { blockLog, clientTag, socialAccount, workerProfile } from '@/db/schema'
import type { gig as gigTable } from '@/db/schema'
import { loadSettings } from '@/features/settings/server/settings-store'
import { type AccountFacts, type Block, type Evaluation, evaluate, type GigFacts, type WorkRow } from '../cooldowns'
import { normalizeCommunity } from '../rules'
import { loadWork } from './history'

type GigRow = typeof gigTable.$inferSelect

export function gigFacts(g: Pick<GigRow, 'id' | 'platform' | 'community' | 'clientTagId' | 'minKarma' | 'minAccountAgeMonths' | 'allowedStates'>): GigFacts {
  return {
    id: g.id,
    platform: g.platform,
    community: normalizeCommunity(g.community),
    clientTagId: g.clientTagId ?? null,
    minKarma: g.minKarma,
    minAccountAgeMonths: g.minAccountAgeMonths,
    allowedStates: g.allowedStates ?? [],
  }
}

export type EligibilityContext = Awaited<ReturnType<typeof loadEligibility>>

/** Loads everything the rules need for a set of workers, in a handful of queries. */
export async function loadEligibility(db: Db, workerIds: string[]) {
  const ids = [...new Set(workerIds)]
  const [settings, accounts, history, profiles, tags] = await Promise.all([
    loadSettings(db),
    ids.length ? db.select().from(socialAccount).where(inArray(socialAccount.workerId, ids)) : Promise.resolve([]),
    loadWork(db, { workerIds: ids }),
    ids.length
      ? db.select({ userId: workerProfile.userId, state: workerProfile.state, fullName: workerProfile.fullName }).from(workerProfile).where(inArray(workerProfile.userId, ids))
      : Promise.resolve([]),
    db.select({ id: clientTag.id, name: clientTag.name }).from(clientTag),
  ])
  const group = <T,>(rows: T[], key: (r: T) => string) => {
    const m = new Map<string, T[]>()
    for (const r of rows) {
      const k = key(r)
      m.set(k, [...(m.get(k) ?? []), r])
    }
    return m
  }
  const tagName = new Map(tags.map((t) => [t.id, t.name]))
  return {
    settings,
    accountsByWorker: group(accounts, (a) => a.workerId),
    historyByWorker: group(history, (w) => w.workerId),
    profileById: new Map(profiles.map((p) => [p.userId, p])),
    clientName: (id: string) => tagName.get(id) ?? 'this client',
  }
}

export function toAccountFacts(a: typeof socialAccount.$inferSelect): AccountFacts {
  return { id: a.id, platform: a.platform, handle: a.handle, createdOn: a.createdOn, karma: a.karma, standing: a.standing }
}

/** All of one worker's accounts against one gig. */
export function evaluateWorker(ctx: EligibilityContext, workerId: string, gig: GigFacts, now = new Date()): Evaluation[] {
  const accounts = (ctx.accountsByWorker.get(workerId) ?? []).map(toAccountFacts)
  const history: WorkRow[] = ctx.historyByWorker.get(workerId) ?? []
  return evaluate({
    gig,
    worker: { state: ctx.profileById.get(workerId)?.state ?? '' },
    accounts,
    history,
    settings: ctx.settings,
    now,
    clientName: ctx.clientName,
  })
}

/** Records why a worker was kept out (R20). One row per gig/worker/rule; repeats are ignored. */
export async function logBlocks(
  db: Db,
  source: 'broadcast' | 'interest' | 'selection',
  gigId: string,
  entries: { workerId: string; accountId?: string | null; block: Pick<Block, 'rule' | 'message' | 'unlockAt'> }[],
) {
  if (!entries.length) return
  const rows = entries.map((e) => ({
    gigId,
    workerId: e.workerId,
    accountId: e.accountId ?? null,
    rule: e.block.rule,
    detail: e.block.message,
    unlockAt: e.block.unlockAt,
    source,
  }))
  // D1 caps bound parameters per statement; insert in modest chunks.
  for (let i = 0; i < rows.length; i += 10) {
    await db.insert(blockLog).values(rows.slice(i, i + 10)).onConflictDoNothing()
  }
}
