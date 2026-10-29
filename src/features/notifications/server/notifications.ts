import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { broadcast, notification } from '@/db/schema'
import { whatsappGroupFor, workerLevels } from '@/features/broadcasts/server/recipients'
import { loadSettings } from '@/features/settings/server/settings-store'
import { userMiddleware } from '@/lib/server/middleware'
import { IN_CHUNK_SIZE, inBatches } from '@/db/in-chunks'

const columns = {
  id: notification.id,
  title: notification.title,
  body: notification.body,
  href: notification.href,
  readAt: notification.readAt,
  createdAt: notification.createdAt,
  html: broadcast.html,
  pinnedAt: broadcast.pinnedAt,
}

/** Pinned broadcasts come back separately so the page can fix them above the feed. */
export const listNotifications = createServerFn({ method: 'GET' })
  .middleware([userMiddleware])
  .validator(z.object({ limit: z.number().int().min(1).max(200).optional() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const mine = eq(notification.userId, user.id)
    const feed = () => db.select(columns).from(notification).leftJoin(broadcast, eq(notification.broadcastId, broadcast.id))
    const [rows, pinned, [unread]] = await Promise.all([
      feed()
        .where(and(mine, isNull(broadcast.pinnedAt)))
        .orderBy(desc(notification.createdAt))
        .limit(data.limit ?? 30),
      feed()
        .where(and(mine, isNotNull(broadcast.pinnedAt)))
        .orderBy(desc(broadcast.pinnedAt))
        .limit(10),
      db
        .select({ n: count() })
        .from(notification)
        .where(and(mine, isNull(notification.readAt))),
    ])
    return { rows, pinned, unread: unread?.n ?? 0 }
  })

export const markNotificationsRead = createServerFn({ method: 'POST' })
  .middleware([userMiddleware])
  .validator(z.object({ ids: z.array(z.string()).optional() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const unread = and(eq(notification.userId, user.id), isNull(notification.readAt))
    const readAt = new Date()
    if (!data.ids?.length) await db.update(notification).set({ readAt }).where(unread)
    else await inBatches(db, data.ids, IN_CHUNK_SIZE, (ids) => db.update(notification).set({ readAt }).where(and(unread, inArray(notification.id, ids))))
    return { ok: true }
  })

/** The WhatsApp group for the worker's current level, when staff have set one. */
export const getMyWhatsappGroup = createServerFn({ method: 'GET' })
  .middleware([userMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context
    if (user.role !== 'worker') return null
    const [settings, levels] = await Promise.all([loadSettings(db), workerLevels(db, [user.id])])
    return whatsappGroupFor(settings, levels.get(user.id) ?? 'warmup')
  })
