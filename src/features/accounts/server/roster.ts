import { createServerFn } from '@tanstack/react-start'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { auditLog, clientTag, gig, socialAccount, submission, user, workerProfile } from '@/db/schema'
import { ACCOUNT_PLATFORMS, ACCOUNT_STANDINGS } from '@/db/schema/enums'
import { loadSettings } from '@/features/settings/server/settings-store'
import { OPEN_ASSIGNMENT } from '@/features/submissions/state'
import { audit } from '@/lib/server/activity'
import { AppError, adminMiddleware } from '@/lib/server/middleware'
import { facet, paginated, pageArgs, tableSearchSchema } from '@/lib/table-query'
import { clientFacet, NO_CLIENT } from '@/features/clients/client-filter'
import { readiness } from '../cooldowns'
import { accountAgeDays, DAY_MS, isKarmaStale, LEVELS, levelFor } from '../rules'
import { createAccount } from './account-service'
import { countsAsClientWork, loadWork } from './history'
import { syncProfileMirror } from './mirror'

export const STANDING_FILTERS = [...ACCOUNT_STANDINGS, 'cooling_down'] as const

export const rosterSearchSchema = tableSearchSchema.extend({
  standing: facet(STANDING_FILTERS),
  level: facet(LEVELS),
  platform: facet(ACCOUNT_PLATFORMS),
  client: clientFacet,
  inUse: z.boolean().optional().catch(undefined),
  /** "Who is free right now" (R3): active, past every cooldown, not in use. */
  free: z.boolean().optional().catch(undefined),
  unconfirmed: z.boolean().optional().catch(undefined),
  workerId: z.string().optional().catch(undefined),
})
export type RosterSearch = z.infer<typeof rosterSearchSchema>

export type RosterRow = Awaited<ReturnType<typeof buildRoster>>['rows'][number]

async function buildRoster(db: Parameters<typeof loadWork>[0], now: Date) {
  const settings = await loadSettings(db)
  const [accounts, work, tags, changes] = await Promise.all([
    db
      .select({
        id: socialAccount.id,
        platform: socialAccount.platform,
        handle: socialAccount.handle,
        url: socialAccount.url,
        workerId: socialAccount.workerId,
        createdOn: socialAccount.createdOn,
        createdOnConfirmedAt: socialAccount.createdOnConfirmedAt,
        karma: socialAccount.karma,
        karmaUpdatedAt: socialAccount.karmaUpdatedAt,
        standing: socialAccount.standing,
        standingNote: socialAccount.standingNote,
        clientTagIds: socialAccount.clientTagIds,
        ownerName: workerProfile.fullName,
        ownerPhone: workerProfile.phone,
        ownerStatus: workerProfile.status,
        ownerImage: user.image,
      })
      .from(socialAccount)
      .innerJoin(user, eq(user.id, socialAccount.workerId))
      .leftJoin(workerProfile, eq(workerProfile.userId, socialAccount.workerId)),
    loadWork(db),
    db.select({ id: clientTag.id, name: clientTag.name, color: clientTag.color }).from(clientTag),
    // SQLite returns the bare columns from the max() row: the latest change per account.
    db
      .select({ entityId: auditLog.entityId, at: sql<number>`max(${auditLog.createdAt})`, by: user.name })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorId))
      .where(eq(auditLog.entityType, 'social_account'))
      .groupBy(auditLog.entityId),
  ])
  const tagById = new Map(tags.map((t) => [t.id, t]))
  const changeById = new Map(changes.map((c) => [c.entityId, { at: new Date(Number(c.at)), by: c.by }]))
  const workByAccount = new Map<string, typeof work>()
  const workByWorker = new Map<string, typeof work>()
  for (const w of work) {
    workByWorker.set(w.workerId, [...(workByWorker.get(w.workerId) ?? []), w])
    if (!w.accountId) continue
    workByAccount.set(w.accountId, [...(workByAccount.get(w.accountId) ?? []), w])
  }

  const rows = accounts.map((a) => {
    const items = (workByAccount.get(a.id) ?? []).sort((x, y) => y.at.getTime() - x.at.getTime())
    const clientWork = items.filter(countsAsClientWork)
    const last = clientWork[0]
    const inUse = items.some((w) => OPEN_ASSIGNMENT.includes(w.status))
    const communities = new Map<string, Date>()
    for (const w of items) if (w.community && w.posted && !communities.has(w.community)) communities.set(w.community, w.at)
    // Person-level and account-level gaps, without a specific gig in mind.
    const ready = readiness(a.id, workByWorker.get(a.workerId) ?? [], settings, now)
    const cooling = a.standing === 'active' && ready.cooling
    const level = levelFor(a.createdOn, now)
    return {
      ...a,
      ageDays: accountAgeDays(a.createdOn, now),
      level,
      karmaStale: a.karma == null || isKarmaStale(a.karmaUpdatedAt, settings.karmaStaleDays, now),
      inUse,
      cooling,
      coolingUntil: cooling ? ready.until : null,
      coolingReason: cooling ? (ready.blocks[0]?.message ?? null) : null,
      free: a.standing === 'active' && !cooling && !inUse && level !== 'warmup' && (a.platform !== 'reddit' || a.createdOn != null),
      lastActivityAt: items[0]?.at ?? null,
      clients: (a.clientTagIds ?? []).flatMap((id) => tagById.get(id) ?? []),
      lastClient: last?.clientTagId ? (tagById.get(last.clientTagId) ?? null) : null,
      daysSinceClientWork: last ? Math.floor((now.getTime() - last.at.getTime()) / DAY_MS) : null,
      communities: [...communities].map(([name, at]) => ({ name, at })),
      totalDone: items.filter((w) => w.status === 'approved').length,
      lastChange: changeById.get(a.id) ?? null,
    }
  })
  return { rows, tags, settings }
}

type Row = RosterRow
const SORTS: Record<string, (r: Row) => string | number | null> = {
  handle: (r) => r.handle,
  owner: (r) => r.ownerName?.toLowerCase() ?? '',
  level: (r) => r.ageDays,
  age: (r) => r.ageDays,
  karma: (r) => r.karma,
  standing: (r) => (r.cooling ? 'active-cooling' : r.standing),
  inUse: (r) => (r.inUse ? 1 : 0),
  lastActivity: (r) => r.lastActivityAt?.getTime() ?? null,
  lastClient: (r) => (r.clients[0] ?? r.lastClient)?.name.toLowerCase() ?? null,
  daysSince: (r) => r.daysSinceClientWork,
  communities: (r) => r.communities.length,
  done: (r) => r.totalDone,
}

function sortRows(rows: Row[], sort: string | undefined) {
  const [field, dir] = (sort ?? 'lastActivity.desc').split('.')
  const key = SORTS[field ?? ''] ?? SORTS.lastActivity
  const mult = dir === 'asc' ? 1 : -1
  return rows.sort((a, b) => {
    const x = key?.(a) ?? null
    const y = key?.(b) ?? null
    // Nulls always last, whichever direction.
    if (x == null && y == null) return a.handle.localeCompare(b.handle)
    if (x == null) return 1
    if (y == null) return -1
    if (x < y) return -1 * mult
    if (x > y) return 1 * mult
    return a.handle.localeCompare(b.handle)
  })
}

export const listAccounts = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(rosterSearchSchema)
  .handler(async ({ data, context }) => {
    const now = new Date()
    const { rows: all, tags, settings } = await buildRoster(context.db, now)
    const platforms = data.platform?.length ? data.platform : ['reddit']
    const inPlatform = all.filter((r) => platforms.includes(r.platform))
    const summary = {
      total: inPlatform.length,
      active: inPlatform.filter((r) => r.standing === 'active').length,
      cooling: inPlatform.filter((r) => r.cooling).length,
      inUse: inPlatform.filter((r) => r.inUse).length,
      warned: inPlatform.filter((r) => r.standing === 'warned').length,
      lost: inPlatform.filter((r) => r.standing === 'banned' || r.standing === 'lost').length,
      free: inPlatform.filter((r) => r.free).length,
      unconfirmed: inPlatform.filter((r) => r.platform === 'reddit' && !r.createdOnConfirmedAt).length,
    }
    const q = data.q?.toLowerCase().replace(/^u\//, '')
    const filtered = inPlatform.filter((r) => {
      if (data.standing?.length && !data.standing.some((s) => (s === 'cooling_down' ? r.cooling : r.standing === s))) return false
      if (data.level?.length && !(r.level && data.level.includes(r.level))) return false
      if (
        data.client?.length &&
        !data.client.some((c) =>
          c === NO_CLIENT ? r.clientTagIds.length === 0 : r.lastClient?.id === c || r.clientTagIds.includes(c),
        )
      )
        return false
      if (data.inUse && !r.inUse) return false
      if (data.free && !r.free) return false
      if (data.unconfirmed && r.createdOnConfirmedAt) return false
      if (data.workerId && r.workerId !== data.workerId) return false
      if (q && !r.handle.includes(q) && !r.ownerName?.toLowerCase().includes(q) && !r.ownerPhone?.includes(q)) return false
      return true
    })
    const { limit, offset, page, perPage } = pageArgs({ ...data, perPage: data.perPage ?? 50 })
    const sorted = sortRows(filtered, data.sort)
    return {
      ...paginated(sorted.slice(offset, offset + limit), sorted.length, page, perPage),
      summary,
      tags,
      karmaStaleDays: settings.karmaStaleDays,
    }
  })

export const getAccountHistory = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db } = context
    const account = await db
      .select({
        account: socialAccount,
        ownerName: workerProfile.fullName,
        ownerPhone: workerProfile.phone,
      })
      .from(socialAccount)
      .leftJoin(workerProfile, eq(workerProfile.userId, socialAccount.workerId))
      .where(eq(socialAccount.id, data.id))
      .get()
    if (!account) throw new AppError('NOT_FOUND', 'Account not found.')
    const addedBy = account.account.addedBy
      ? await db.select({ name: user.name }).from(user).where(eq(user.id, account.account.addedBy)).get()
      : null
    const [tasks, changes] = await Promise.all([
      db
        .select({
          id: submission.id,
          status: submission.status,
          proofUrl: submission.proofUrl,
          community: submission.community,
          level: submission.level,
          payoutAmount: submission.payoutAmount,
          claimedAt: submission.claimedAt,
          firstSubmittedAt: submission.firstSubmittedAt,
          decidedAt: submission.decidedAt,
          gigId: gig.id,
          gigTitle: gig.title,
          taskType: gig.taskType,
          clientName: clientTag.name,
          clientColor: clientTag.color,
        })
        .from(submission)
        .innerJoin(gig, eq(gig.id, submission.gigId))
        .leftJoin(clientTag, eq(clientTag.id, submission.clientTagId))
        .where(eq(submission.accountId, data.id))
        .orderBy(desc(sql`coalesce(${submission.firstSubmittedAt}, ${submission.claimedAt})`)),
      db
        .select({
          id: auditLog.id,
          action: auditLog.action,
          meta: auditLog.meta,
          createdAt: auditLog.createdAt,
          actorName: user.name,
        })
        .from(auditLog)
        .leftJoin(user, eq(user.id, auditLog.actorId))
        .where(sql`${auditLog.entityType} = 'social_account' and ${auditLog.entityId} = ${data.id}`)
        .orderBy(desc(auditLog.createdAt))
        .limit(100),
    ])
    type Scalar = string | number | boolean | null
    return {
      ...account,
      addedByName: addedBy?.name ?? null,
      tasks,
      changes: changes.map((c) => ({ ...c, meta: (c.meta ?? {}) as { field?: string; from?: Scalar; to?: Scalar } })),
    }
  })

export const updateAccount = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      id: z.string(),
      standing: z.enum(ACCOUNT_STANDINGS).optional(),
      standingNote: z.string().trim().max(500).nullable().optional(),
      karma: z.number().int().min(0).max(100_000_000).optional(),
      /** Epoch ms of the account's creation date. */
      createdOn: z.number().int().positive().optional(),
      confirmCreatedOn: z.boolean().optional(),
      /** The clients this account is used for. */
      clientTagIds: z.array(z.string()).max(20).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { db, user: me } = context
    const current = await db.select().from(socialAccount).where(eq(socialAccount.id, data.id)).get()
    if (!current) throw new AppError('NOT_FOUND', 'Account not found.')
    const now = new Date()
    const patch: Partial<typeof socialAccount.$inferInsert> = {}
    const changed: { field: string; from: unknown; to: unknown }[] = []
    if (data.standing && data.standing !== current.standing) {
      patch.standing = data.standing
      changed.push({ field: 'standing', from: current.standing, to: data.standing })
    }
    if (data.standingNote !== undefined && (data.standingNote || null) !== current.standingNote) {
      patch.standingNote = data.standingNote || null
      changed.push({ field: 'standingNote', from: current.standingNote, to: patch.standingNote })
    }
    if (data.karma !== undefined) {
      // Re-entering the same number still refreshes the date: it was checked today.
      patch.karma = data.karma
      patch.karmaUpdatedAt = now
      changed.push({ field: 'karma', from: current.karma, to: data.karma })
    }
    if (data.createdOn !== undefined && data.createdOn !== current.createdOn?.getTime()) {
      if (data.createdOn > now.getTime()) throw new AppError('BAD_REQUEST', 'Creation date cannot be in the future.')
      // Existing assignments keep their locked level and rate (R27) — only future work sees the new date.
      patch.createdOn = new Date(data.createdOn)
      changed.push({ field: 'createdOn', from: current.createdOn?.getTime() ?? null, to: data.createdOn })
    }
    if ((data.confirmCreatedOn || data.createdOn !== undefined) && !current.createdOnConfirmedAt) {
      patch.createdOnConfirmedAt = now
      patch.createdOnConfirmedBy = me.id
      changed.push({ field: 'createdOnConfirmed', from: false, to: true })
    } else if (data.createdOn !== undefined) {
      patch.createdOnConfirmedAt = now
      patch.createdOnConfirmedBy = me.id
    }
    if (data.clientTagIds !== undefined) {
      const next = [...new Set(data.clientTagIds)]
      const before = current.clientTagIds ?? []
      if (next.length !== before.length || next.some((id) => !before.includes(id))) {
        const tags = await db.select({ id: clientTag.id, name: clientTag.name }).from(clientTag)
        const names = (ids: string[]) =>
          ids.map((id) => tags.find((t) => t.id === id)?.name).filter(Boolean).join(', ') || null
        if (next.some((id) => !tags.some((t) => t.id === id))) throw new AppError('BAD_REQUEST', 'Unknown client.')
        patch.clientTagIds = next
        changed.push({ field: 'clients', from: names(before), to: names(next) })
      }
    }
    if (!changed.length) return { ok: true, changed: 0 }
    await db.update(socialAccount).set(patch).where(eq(socialAccount.id, data.id))
    await Promise.all(
      changed.map((c) =>
        audit(db, { actorId: me.id, action: `account.${c.field}`, entityType: 'social_account', entityId: data.id, meta: c }),
      ),
    )
    if (current.platform === 'reddit') await syncProfileMirror(db, current.workerId)
    return { ok: true, changed: changed.length }
  })

/** Lightweight list for pickers (direct assignment, add-for-worker). */
export const listClientTagsLite = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(({ context }) =>
    context.db
      .select({ id: clientTag.id, name: clientTag.name, color: clientTag.color })
      .from(clientTag)
      .orderBy(asc(clientTag.name)),
  )

/** Staff add accounts for a worker (R38): an unrecorded account is invisible to every rule. */
export const adminAddAccount = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      workerId: z.string(),
      platform: z.enum(ACCOUNT_PLATFORMS),
      url: z.string().trim().min(2).max(300),
      /** Epoch ms (IST midnight) of the creation date. */
      createdOn: z.number().int().positive().optional(),
      karma: z.number().int().min(0).max(100_000_000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const exists = await context.db.select({ id: user.id }).from(user).where(eq(user.id, data.workerId)).get()
    if (!exists) throw new AppError('NOT_FOUND', 'Worker not found.')
    const row = await createAccount(context.db, {
      workerId: data.workerId,
      platform: data.platform,
      input: data.url,
      createdOn: data.createdOn ? new Date(data.createdOn) : null,
      karma: data.karma ?? null,
      actorId: context.user.id,
      confirmed: true,
    })
    return { id: row.id }
  })
