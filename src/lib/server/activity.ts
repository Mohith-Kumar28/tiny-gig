import { waitUntil } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { sendPush } from '@/features/push/server/send-push'
import { schema } from '@/db/client'

export function audit(
  db: Db,
  entry: { actorId: string | null; action: string; entityType: string; entityId: string; meta?: Record<string, unknown> },
) {
  return db.insert(schema.auditLog).values(entry)
}

export function notify(
  db: Db,
  entries: { userId: string; title: string; body?: string; href?: string }[],
) {
  if (!entries.length) return Promise.resolve()
  // Same message to their phones, after the response; push is best-effort.
  waitUntil(sendPush(db, entries).catch((err) => console.error('[push]', err)))
  // D1 limits bound parameters per statement, so large fan-outs go in chunks.
  if (entries.length <= 15) return db.insert(schema.notification).values(entries)
  return (async () => {
    for (let i = 0; i < entries.length; i += 15) await db.insert(schema.notification).values(entries.slice(i, i + 15))
  })()
}

/** Same message to every admin: bell, and push on any device they turned alerts on for. */
export async function notifyAdmins(db: Db, entry: { title: string; body?: string; href?: string }) {
  const admins = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.role, 'admin'))
  return notify(
    db,
    admins.map((a) => ({ userId: a.id, ...entry })),
  )
}
