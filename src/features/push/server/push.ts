import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { and, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { pushSubscription } from '@/db/schema'
import { userMiddleware } from '@/lib/server/middleware'
import { pushEnv } from './push-env'
import { sendPush } from './send-push'

export const getPushConfig = createServerFn({ method: 'GET' })
  .middleware([userMiddleware])
  .handler(async ({ context }) => {
    const subs = await context.db
      .select({ endpoint: pushSubscription.endpoint, userAgent: pushSubscription.userAgent, createdAt: pushSubscription.createdAt })
      .from(pushSubscription)
      .where(eq(pushSubscription.userId, context.user.id))
    return { publicKey: pushEnv().VAPID_PUBLIC_KEY ?? null, endpoints: subs.map((s) => s.endpoint), devices: subs }
  })

export const savePushSubscription = createServerFn({ method: 'POST' })
  .middleware([userMiddleware])
  .validator(z.object({ endpoint: z.url().max(1000), p256dh: z.string().max(200), auth: z.string().max(100) }))
  .handler(async ({ data, context }) => {
    await context.db
      .insert(pushSubscription)
      .values({ userId: context.user.id, ...data, userAgent: getRequestHeader('user-agent')?.slice(0, 300) ?? null })
      .onConflictDoUpdate({ target: pushSubscription.endpoint, set: { userId: context.user.id, p256dh: data.p256dh, auth: data.auth } })
    return { ok: true }
  })

export const removePushSubscription = createServerFn({ method: 'POST' })
  .middleware([userMiddleware])
  .validator(z.object({ endpoint: z.string().max(1000) }))
  .handler(async ({ data, context }) => {
    await context.db.delete(pushSubscription).where(and(eq(pushSubscription.endpoint, data.endpoint), eq(pushSubscription.userId, context.user.id)))
    return { ok: true }
  })

/**
 * Turns alerts off on every other browser/device of this person. The switch only controls the
 * browser it's shown in, so this is the way to silence a device you can't reach (an old laptop,
 * or a subscription made on a previous site address).
 */
export const removeOtherPushSubscriptions = createServerFn({ method: 'POST' })
  .middleware([userMiddleware])
  .validator(z.object({ keep: z.string().max(1000).nullable() }))
  .handler(async ({ data, context }) => {
    const mine = eq(pushSubscription.userId, context.user.id)
    await context.db.delete(pushSubscription).where(data.keep ? and(mine, ne(pushSubscription.endpoint, data.keep)) : mine)
    return { ok: true }
  })

/** Pings every device this person turned alerts on for, so they can see it works. */
export const sendTestPush = createServerFn({ method: 'POST' })
  .middleware([userMiddleware])
  .handler(async ({ context }) => {
    const subs = await context.db.select({ endpoint: pushSubscription.endpoint }).from(pushSubscription).where(eq(pushSubscription.userId, context.user.id))
    if (!subs.length) return { devices: 0 }
    const href = context.user.role === 'admin' ? '/admin' : '/w'
    const r = await sendPush(context.db, [
      { userId: context.user.id, title: 'TinyGig alerts are on', body: 'This is how new gigs and updates will reach you.', href },
    ])
    return { devices: subs.length, sent: r.sent, configured: r.configured, failed: r.failed }
  })
