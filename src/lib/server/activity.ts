import type { Db } from '@/db/client'
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
  // D1 limits bound parameters per statement, so large fan-outs go in chunks.
  if (entries.length <= 15) return db.insert(schema.notification).values(entries)
  return (async () => {
    for (let i = 0; i < entries.length; i += 15) await db.insert(schema.notification).values(entries.slice(i, i + 15))
  })()
}
