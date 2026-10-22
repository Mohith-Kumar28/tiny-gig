import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '@/db/client'
import { socialAccount, warmupCompletion, warmupItem, workerProfile } from '@/db/schema'
import type { WarmupAudience } from '@/db/schema/accounts'
import { accountLabel, levelFor, levelStartsAt } from '@/features/accounts/rules'
import { audit, notify } from '@/lib/server/activity'
import { adminMiddleware, AppError, workerMiddleware } from '@/lib/server/middleware'
import { matchesAudience } from '../rules'

const audienceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('all') }),
  z.object({ type: z.literal('workers'), workerIds: z.array(z.string()).min(1).max(500) }),
  z.object({ type: z.literal('filter'), maxKarma: z.number().int().min(0).optional(), maxAgeDays: z.number().int().min(0).optional() }),
])


async function approvedWorkersWithAccounts(db: Db) {
  const [workers, accounts] = await Promise.all([
    db.select({ userId: workerProfile.userId, name: workerProfile.fullName }).from(workerProfile).where(eq(workerProfile.status, 'approved')),
    db
      .select({ workerId: socialAccount.workerId, platform: socialAccount.platform, createdOn: socialAccount.createdOn, karma: socialAccount.karma, standing: socialAccount.standing })
      .from(socialAccount),
  ])
  const byWorker = new Map<string, typeof accounts>()
  for (const a of accounts) byWorker.set(a.workerId, [...(byWorker.get(a.workerId) ?? []), a])
  return workers.map((w) => ({ ...w, accounts: byWorker.get(w.userId) ?? [] }))
}

async function audienceOf(db: Db, audience: WarmupAudience) {
  const now = new Date()
  return (await approvedWorkersWithAccounts(db)).filter((w) => matchesAudience(audience, w.userId, w.accounts, now))
}

export const previewWarmupAudience = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(audienceSchema)
  .handler(async ({ data, context }) => ({ count: (await audienceOf(context.db, data)).length }))

export const listWarmupItems = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const db = context.db
    const [items, done, workers] = await Promise.all([
      db.select().from(warmupItem).orderBy(desc(warmupItem.createdAt)).limit(100),
      db.select({ itemId: warmupCompletion.itemId, workerId: warmupCompletion.workerId, doneAt: warmupCompletion.doneAt }).from(warmupCompletion),
      approvedWorkersWithAccounts(db),
    ])
    const now = new Date()
    return items.map((it) => {
      const audience = workers.filter((w) => matchesAudience(it.audience, w.userId, w.accounts, now))
      const doneBy = new Map(done.filter((d) => d.itemId === it.id).map((d) => [d.workerId, d.doneAt]))
      return {
        ...it,
        audienceSize: audience.length,
        doneCount: audience.filter((w) => doneBy.has(w.userId)).length,
        people: audience.map((w) => ({ id: w.userId, name: w.name, doneAt: doneBy.get(w.userId) ?? null })),
      }
    })
  })

/** Push a warm-up item (R54, R55). The matching workers get a notification. */
export const saveWarmupItem = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      title: z.string().trim().min(3).max(120),
      instructions: z.string().trim().min(3).max(3000),
      links: z.array(z.url().max(300)).max(20),
      audience: audienceSchema,
    }),
  )
  .handler(async ({ data, context }) => {
    const db = context.db
    const [row] = await db.insert(warmupItem).values({ ...data, createdBy: context.user.id }).returning({ id: warmupItem.id })
    if (!row) throw new AppError('BAD_REQUEST', 'Could not save.')
    const people = await audienceOf(db, data.audience)
    await notify(
      db,
      people.map((p) => ({ userId: p.userId, title: `Warm-up: ${data.title}`, body: 'Unpaid account building. Open the Warm-up tab.', href: '/w/warmup' })),
    )
    await audit(db, { actorId: context.user.id, action: 'warmup.push', entityType: 'warmup_item', entityId: row.id, meta: { audience: data.audience, sent: people.length } })
    return { id: row.id, sent: people.length }
  })

export const archiveWarmupItem = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    await context.db.update(warmupItem).set({ archivedAt: new Date() }).where(eq(warmupItem.id, data.id))
    return { ok: true }
  })

/** The worker's Warm-up tab (R53): their items, and their accounts still warming up (R58). */
export const getMyWarmup = createServerFn({ method: 'GET' })
  .middleware([workerMiddleware])
  .handler(async ({ context }) => {
    const db = context.db
    const now = new Date()
    const [items, accounts, done] = await Promise.all([
      db.select().from(warmupItem).where(isNull(warmupItem.archivedAt)).orderBy(desc(warmupItem.createdAt)).limit(100),
      db.select().from(socialAccount).where(eq(socialAccount.workerId, context.user.id)),
      db.select().from(warmupCompletion).where(eq(warmupCompletion.workerId, context.user.id)),
    ])
    const doneBy = new Map(done.map((d) => [d.itemId, d.doneAt]))
    return {
      items: items
        .filter((it) => matchesAudience(it.audience, context.user.id, accounts, now))
        .map((it) => ({ id: it.id, title: it.title, instructions: it.instructions, links: it.links, createdAt: it.createdAt, doneAt: doneBy.get(it.id) ?? null })),
      warming: accounts
        .filter((a) => a.platform === 'reddit' && levelFor(a.createdOn, now) === 'warmup' && a.createdOn)
        .map((a) => ({ id: a.id, label: accountLabel(a.platform, a.handle), paidFrom: levelStartsAt(a.createdOn as Date, 'L1') })),
    }
  })

/** Self-reported (R57). */
export const setWarmupDone = createServerFn({ method: 'POST' })
  .middleware([workerMiddleware])
  .validator(z.object({ itemId: z.string(), done: z.boolean() }))
  .handler(async ({ data, context }) => {
    const db = context.db
    if (data.done) {
      await db.insert(warmupCompletion).values({ itemId: data.itemId, workerId: context.user.id, doneAt: new Date() }).onConflictDoNothing()
    } else {
      await db.delete(warmupCompletion).where(and(eq(warmupCompletion.itemId, data.itemId), eq(warmupCompletion.workerId, context.user.id)))
    }
    return { ok: true }
  })

