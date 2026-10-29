import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { notification } from '@/db/schema'
import { userMiddleware } from '@/lib/server/middleware'
import { IN_CHUNK_SIZE, inBatches } from '@/db/in-chunks'


export const listNotifications = createServerFn({ method: 'GET' })
  .middleware([userMiddleware])
  .validator(z.object({ limit: z.number().int().min(1).max(200).optional() }))
  .handler(async ({ data, context }) => {
    const [rows, [unread]] = await Promise.all([
      context.db.query.notification.findMany({
        where: eq(notification.userId, context.user.id),
        orderBy: desc(notification.createdAt),
        limit: data.limit ?? 30,
      }),
      context.db
        .select({ n: count() })
        .from(notification)
        .where(and(eq(notification.userId, context.user.id), isNull(notification.readAt))),
    ])
    return { rows, unread: unread?.n ?? 0 }
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
