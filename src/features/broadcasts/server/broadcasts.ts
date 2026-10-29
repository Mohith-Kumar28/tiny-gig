import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import { z } from 'zod'
import { broadcast, notification } from '@/db/schema'
import { inChunks } from '@/db/in-chunks'
import { queueBulkEmail } from '@/emails/send-email'
import { audit, notify } from '@/lib/server/activity'
import { adminMiddleware, AppError } from '@/lib/server/middleware'
import { broadcastAudienceSchema } from '../audience'
import { excerpt, plainText, renderHtml, richDocSchema } from '../rich-text'
import { resolveAudience } from './recipients'

export const previewBroadcastAudience = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(broadcastAudienceSchema)
  .handler(async ({ data, context }) => {
    const workers = await resolveAudience(context.db, data)
    const byLevel: Record<string, number> = {}
    for (const w of workers) byLevel[w.level] = (byLevel[w.level] ?? 0) + 1
    return { count: workers.length, byLevel }
  })

export const sendBroadcast = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      subject: z.string().trim().min(1).max(140),
      doc: richDocSchema,
      audience: broadcastAudienceSchema,
      channels: z.object({ email: z.boolean(), push: z.boolean() }),
      pinned: z.boolean(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const text = plainText(data.doc)
    if (!text) throw new AppError('BAD_REQUEST', 'Write a message first.')
    const recipients = await resolveAudience(db, data.audience)
    if (!recipients.length) throw new AppError('BAD_REQUEST', 'No approved workers match this audience.')
    const html = renderHtml(data.doc)
    // d1-bounded: one row
    const [row] = await db
      .insert(broadcast)
      .values({
        subject: data.subject,
        doc: data.doc,
        html,
        audience: data.audience,
        channels: data.channels,
        recipientCount: recipients.length,
        pinnedAt: data.pinned ? new Date() : null,
        createdBy: user.id,
      })
      .returning({ id: broadcast.id })
    if (!row) throw new Error('Could not save the broadcast')
    const body = excerpt(text)
    await notify(
      db,
      recipients.map((r) => ({ userId: r.userId, title: data.subject, body, href: '/w/notifications', broadcastId: row.id })),
      { push: data.channels.push },
    )
    if (data.channels.email) {
      queueBulkEmail({
        to: recipients.map((r) => r.email),
        template: 'broadcast',
        data: { subject: data.subject, html, preview: excerpt(text, 120) },
      })
    }
    await audit(db, {
      actorId: user.id,
      action: 'broadcast.send',
      entityType: 'broadcast',
      entityId: row.id,
      meta: { recipients: recipients.length, ...data.channels },
    })
    return { id: row.id, sent: recipients.length }
  })

export const listBroadcasts = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const { db } = context
    const rows = await db
      .select({
        id: broadcast.id,
        subject: broadcast.subject,
        html: broadcast.html,
        audience: broadcast.audience,
        channels: broadcast.channels,
        recipientCount: broadcast.recipientCount,
        pinnedAt: broadcast.pinnedAt,
        createdAt: broadcast.createdAt,
      })
      .from(broadcast)
      .orderBy(desc(broadcast.createdAt))
      .limit(100)
    const reads = await inChunks(
      db,
      rows.map((r) => r.id),
      (ids) =>
        db
          .select({ id: notification.broadcastId, n: count() })
          .from(notification)
          .where(and(inArray(notification.broadcastId, ids), isNotNull(notification.readAt)))
          .groupBy(notification.broadcastId),
    )
    const readBy = new Map(reads.map((r) => [r.id, r.n]))
    return rows.map((r) => ({ ...r, readCount: readBy.get(r.id) ?? 0 }))
  })

export const setBroadcastPinned = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string(), pinned: z.boolean() }))
  .handler(async ({ data, context }) => {
    await context.db
      .update(broadcast)
      .set({ pinnedAt: data.pinned ? new Date() : null })
      .where(eq(broadcast.id, data.id))
    return { ok: true }
  })

/** Removes the message from every worker's notifications too. Emails and pushes already sent stay sent. */
export const deleteBroadcast = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context
    await db.delete(notification).where(eq(notification.broadcastId, data.id))
    await db.delete(broadcast).where(eq(broadcast.id, data.id))
    await audit(db, { actorId: user.id, action: 'broadcast.delete', entityType: 'broadcast', entityId: data.id })
    return { ok: true }
  })
