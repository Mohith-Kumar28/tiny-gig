import { buildPushPayload } from '@block65/webcrypto-web-push'
import { inArray } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { pushSubscription } from '@/db/schema'
import { pushEnv } from './push-env'

function vapid() {
  const e = pushEnv()
  if (!e.VAPID_PUBLIC_KEY || !e.VAPID_PRIVATE_KEY) return null
  const subject = e.VAPID_SUBJECT ?? `mailto:${(e.ADMIN_EMAILS ?? '').split(',')[0]?.trim() || 'support@tinygig.in'}`
  return { subject, publicKey: e.VAPID_PUBLIC_KEY, privateKey: e.VAPID_PRIVATE_KEY }
}

/** Sends to every device each user subscribed. Dead subscriptions (404/410) are dropped. Never throws. */
export async function sendPush(db: Db, items: { userId: string; title: string; body?: string; href?: string }[]) {
  const keys = vapid()
  if (!keys || !items.length) return
  const subs = await db.select().from(pushSubscription).where(inArray(pushSubscription.userId, [...new Set(items.map((i) => i.userId))]))
  if (!subs.length) return
  const byUser = new Map<string, typeof subs>()
  for (const s of subs) byUser.set(s.userId, [...(byUser.get(s.userId) ?? []), s])
  const dead: string[] = []
  await Promise.all(
    items.flatMap((item) =>
      (byUser.get(item.userId) ?? []).map(async (s) => {
        try {
          const payload = await buildPushPayload(
            { data: { title: item.title, body: item.body ?? '', href: item.href ?? '/w' }, options: { ttl: 3600, urgency: 'high' } },
            { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
            keys,
          )
          const res = await fetch(s.endpoint, payload)
          if (res.status === 404 || res.status === 410) dead.push(s.endpoint)
        } catch (err) {
          console.error('[push] failed', err)
        }
      }),
    ),
  )
  if (dead.length) await db.delete(pushSubscription).where(inArray(pushSubscription.endpoint, dead))
}
