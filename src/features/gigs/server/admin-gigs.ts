import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, gte, inArray, like, or, type SQL, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '@/db/client'
import { gig, submission, workerProfile } from '@/db/schema'
import { GIG_STATUSES, PLATFORMS, SUBMISSION_STATUSES, TASK_TYPES } from '@/db/schema/enums'
import { queueBulkEmail } from '@/emails/send-email'
import { rupeesToPaise } from '@/lib/format'
import { audit } from '@/lib/server/activity'
import { AppError, adminMiddleware } from '@/lib/server/middleware'
import { slugify } from '@/lib/slug'
import { facet, orderByFrom, pageArgs, paginated, tableSearchSchema } from '@/lib/table-query'
import { gigFormSchema, type GigFormValues } from '../schemas'


export const gigsSearchSchema = tableSearchSchema.extend({
  status: facet(GIG_STATUSES),
  platform: facet(PLATFORMS),
  taskType: facet(TASK_TYPES),
})
export type GigsSearch = z.infer<typeof gigsSearchSchema>

export const listGigs = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(gigsSearchSchema)
  .handler(async ({ data, context }) => {
    const { db } = context
    const { limit, offset, page, perPage } = pageArgs(data)
    const filters: SQL[] = []
    if (data.status?.length) filters.push(inArray(gig.status, data.status))
    if (data.platform?.length) filters.push(inArray(gig.platform, data.platform))
    if (data.taskType?.length) filters.push(inArray(gig.taskType, data.taskType))
    if (data.q) {
      const q = `%${data.q.toLowerCase()}%`
      filters.push(or(like(sql`lower(${gig.title})`, q), like(sql`lower(${gig.community})`, q)) as SQL)
    }
    const where = filters.length ? and(...filters) : undefined
    const pending = sql<number>`(select count(*) from "submission" s where s."gig_id" = "gig"."id" and s."status" in ('submitted','resubmitted'))`
    const approved = sql<number>`(select count(*) from "submission" s where s."gig_id" = "gig"."id" and s."status" = 'approved')`
    const orderBy = orderByFrom(
      data.sort,
      {
        title: gig.title,
        payout: gig.payoutAmount,
        slots: gig.totalSlots,
        claimed: gig.claimedSlots,
        createdAt: gig.createdAt,
        endsAt: gig.endsAt,
        priority: gig.priority,
        pending,
      },
      desc(gig.createdAt),
    )
    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id: gig.id,
          title: gig.title,
          platform: gig.platform,
          taskType: gig.taskType,
          community: gig.community,
          status: gig.status,
          payoutAmount: gig.payoutAmount,
          totalSlots: gig.totalSlots,
          claimedSlots: gig.claimedSlots,
          liveHoldHours: gig.liveHoldHours,
          endsAt: gig.endsAt,
          createdAt: gig.createdAt,
          priority: gig.priority,
          pending,
          approved,
        })
        .from(gig)
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ n: count() }).from(gig).where(where),
    ])
    return paginated(rows, totalRow?.n ?? 0, page, perPage)
  })

export const getGigAdmin = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const row = await context.db.query.gig.findFirst({ where: eq(gig.id, data.id) })
    if (!row) throw new AppError('NOT_FOUND', 'Gig not found.')
    const counts = await context.db
      .select({ status: submission.status, n: count() })
      .from(submission)
      .where(eq(submission.gigId, data.id))
      .groupBy(submission.status)
    return {
      gig: row,
      counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) as Partial<
        Record<(typeof SUBMISSION_STATUSES)[number], number>
      >,
    }
  })

function toRow(v: GigFormValues) {
  return {
    title: v.title,
    platform: v.platform,
    taskType: v.taskType,
    brief: v.brief,
    targetUrl: v.targetUrl || null,
    community: v.community || null,
    contentGuidelines: v.contentGuidelines || null,
    sampleContent: v.sampleContent || null,
    reviewChecklist: v.reviewChecklist,
    payoutAmount: rupeesToPaise(v.payoutRupees),
    totalSlots: v.totalSlots,
    claimWindowHours: v.claimWindowHours,
    liveHoldHours: v.liveHoldHours,
    minKarma: v.minKarma,
    minAccountAgeMonths: v.minAccountAgeMonths,
    allowedStates: v.allowedStates,
    startsAt: v.startsAt ? new Date(v.startsAt) : null,
    endsAt: v.endsAt ? new Date(v.endsAt) : null,
    priority: v.priority,
    status: v.status,
  }
}

/** Emails approved workers who meet the requirements and opted into new-gig emails. */
async function announceGig(db: Db, g: typeof gig.$inferSelect) {
  const filters: SQL[] = [
    eq(workerProfile.status, 'approved'),
    gte(workerProfile.karma, g.minKarma),
    gte(workerProfile.accountAgeMonths, g.minAccountAgeMonths),
    sql`json_extract(${workerProfile.emailPrefs}, '$.newGigs') = 1`,
  ]
  if (g.allowedStates.length) filters.push(inArray(workerProfile.state, g.allowedStates))
  const recipients = await db.select({ email: workerProfile.email }).from(workerProfile).where(and(...filters))
  queueBulkEmail({
    to: recipients.map((r) => r.email),
    template: 'newGig',
    data: { title: g.title, platform: g.platform, payout: g.payoutAmount, gigId: g.id },
  })
  return recipients.length
}

export const saveGig = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(gigFormSchema.extend({ id: z.string().optional() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const { id, notifyWorkers, ...form } = data
    const values = toRow({ ...form, notifyWorkers })
    let saved: typeof gig.$inferSelect | undefined
    let wasLive = false

    if (id) {
      const existing = await db.query.gig.findFirst({ where: eq(gig.id, id) })
      if (!existing) throw new AppError('NOT_FOUND', 'Gig not found.')
      if (values.totalSlots < existing.claimedSlots) {
        throw new AppError('BAD_REQUEST', `Slots can't go below the ${existing.claimedSlots} already claimed.`)
      }
      wasLive = Boolean(existing.publishedAt)
      ;[saved] = await db
        .update(gig)
        .set({ ...values, publishedAt: values.status === 'live' ? (existing.publishedAt ?? new Date()) : existing.publishedAt })
        .where(eq(gig.id, id))
        .returning()
    } else {
      ;[saved] = await db
        .insert(gig)
        .values({
          ...values,
          slug: slugify(values.title),
          createdBy: user.id,
          publishedAt: values.status === 'live' ? new Date() : null,
        })
        .returning()
    }
    if (!saved) throw new AppError('BAD_REQUEST', 'Could not save gig.')

    let notified = 0
    if (saved.status === 'live' && !wasLive && notifyWorkers) notified = await announceGig(db, saved)
    await audit(db, { actorId: user.id, action: id ? 'gig.update' : 'gig.create', entityType: 'gig', entityId: saved.id })
    return { id: saved.id, notified }
  })

export const setGigStatus = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ ids: z.array(z.string()).min(1), status: z.enum(GIG_STATUSES), notifyWorkers: z.boolean().optional() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const targets = await db.query.gig.findMany({ where: inArray(gig.id, data.ids) })
    let notified = 0
    for (const t of targets) {
      const firstPublish = data.status === 'live' && !t.publishedAt
      const [updated] = await db
        .update(gig)
        .set({ status: data.status, publishedAt: firstPublish ? new Date() : t.publishedAt })
        .where(eq(gig.id, t.id))
        .returning()
      if (firstPublish && updated && data.notifyWorkers !== false) notified += await announceGig(db, updated)
      await audit(db, { actorId: user.id, action: `gig.status.${data.status}`, entityType: 'gig', entityId: t.id })
    }
    return { updated: targets.length, notified }
  })

export const duplicateGig = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const src = await context.db.query.gig.findFirst({ where: eq(gig.id, data.id) })
    if (!src) throw new AppError('NOT_FOUND', 'Gig not found.')
    const { id: _id, slug: _slug, createdAt: _c, updatedAt: _u, publishedAt: _p, claimedSlots: _cs, ...rest } = src
    const [copy] = await context.db
      .insert(gig)
      .values({ ...rest, title: `${src.title} (copy)`, slug: slugify(src.title), status: 'draft', createdBy: context.user.id })
      .returning({ id: gig.id })
    return { id: copy?.id }
  })

export const deleteGig = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const [used] = await context.db.select({ n: count() }).from(submission).where(eq(submission.gigId, data.id))
    if ((used?.n ?? 0) > 0) throw new AppError('CONFLICT', 'This gig has submissions. Close it instead of deleting.')
    await context.db.delete(gig).where(eq(gig.id, data.id))
    await audit(context.db, { actorId: context.user.id, action: 'gig.delete', entityType: 'gig', entityId: data.id })
    return { ok: true }
  })

/** Small list for filter dropdowns / command palette. */
export const listGigOptions = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(({ context }) =>
    context.db
      .select({ id: gig.id, title: gig.title, platform: gig.platform, status: gig.status })
      .from(gig)
      .orderBy(desc(gig.createdAt))
      .limit(300),
  )
