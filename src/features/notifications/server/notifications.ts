import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { notification } from '@/db/schema'
import { userMiddleware } from '@/lib/server/middleware'


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
    const filters = [eq(notification.userId, context.user.id), isNull(notification.readAt)]
    if (data.ids?.length) filters.push(inArray(notification.id, data.ids))
    await context.db.update(notification).set({ readAt: new Date() }).where(and(...filters))
    return { ok: true }
  })
