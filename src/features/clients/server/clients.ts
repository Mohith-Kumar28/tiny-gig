import { createServerFn } from '@tanstack/react-start'
import { asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { clientTag, submission } from '@/db/schema'
import { TAG_COLORS } from '@/features/accounts/components/client-chip'
import { audit } from '@/lib/server/activity'
import { AppError, adminMiddleware } from '@/lib/server/middleware'

/** Admin-only. Client tags must never reach a worker-facing payload (R44). */
export const listClients = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const now = Date.now()
    const d7 = now - 7 * 86_400_000
    const d30 = now - 30 * 86_400_000
    const posted = sql`coalesce(${submission.firstSubmittedAt}, 0)`
    return context.db
      .select({
        id: clientTag.id,
        name: clientTag.name,
        color: clientTag.color,
        archivedAt: clientTag.archivedAt,
        posts7: sql<number>`coalesce(sum(case when ${posted} > ${d7} then 1 else 0 end), 0)`,
        posts30: sql<number>`coalesce(sum(case when ${posted} > ${d30} then 1 else 0 end), 0)`,
        accounts30: sql<number>`count(distinct case when ${posted} > ${d30} then ${submission.accountId} end)`,
        approved: sql<number>`coalesce(sum(case when ${submission.status} = 'approved' then 1 else 0 end), 0)`,
        spend: sql<number>`coalesce(sum(case when ${submission.status} = 'approved' then ${submission.payoutAmount} else 0 end), 0)`,
      })
      .from(clientTag)
      .leftJoin(submission, eq(submission.clientTagId, clientTag.id))
      .groupBy(clientTag.id)
      .orderBy(sql`${clientTag.archivedAt} is not null`, asc(clientTag.name))
  })

export const saveClient = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(40), color: z.enum(TAG_COLORS) }))
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const clash = await db.select({ id: clientTag.id }).from(clientTag).where(sql`lower(${clientTag.name}) = ${data.name.toLowerCase()}`).get()
    if (clash && clash.id !== data.id) throw new AppError('CONFLICT', 'A client with that name already exists.')
    if (data.id) {
      await db.update(clientTag).set({ name: data.name, color: data.color }).where(eq(clientTag.id, data.id))
      await audit(db, { actorId: user.id, action: 'client.update', entityType: 'client_tag', entityId: data.id, meta: data })
      return { id: data.id }
    }
    const [row] = await db.insert(clientTag).values({ name: data.name, color: data.color }).returning({ id: clientTag.id })
    if (row) await audit(db, { actorId: user.id, action: 'client.create', entityType: 'client_tag', entityId: row.id, meta: data })
    return { id: row?.id }
  })

/** Archived clients stay on past work (history matters for cooldowns) but leave the pickers. */
export const setClientArchived = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string(), archived: z.boolean() }))
  .handler(async ({ data, context }) => {
    await context.db.update(clientTag).set({ archivedAt: data.archived ? new Date() : null }).where(eq(clientTag.id, data.id))
    await audit(context.db, { actorId: context.user.id, action: data.archived ? 'client.archive' : 'client.restore', entityType: 'client_tag', entityId: data.id })
    return { ok: true }
  })

/** Tag a piece of work with its client when it goes live (R43). */
export const setSubmissionClient = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ submissionId: z.string(), clientTagId: z.string().nullable() }))
  .handler(async ({ data, context }) => {
    await context.db.update(submission).set({ clientTagId: data.clientTagId }).where(eq(submission.id, data.submissionId))
    await audit(context.db, { actorId: context.user.id, action: 'submission.client', entityType: 'submission', entityId: data.submissionId, meta: { clientTagId: data.clientTagId } })
    return { ok: true }
  })
