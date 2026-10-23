import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, inArray, like, or, type SQL, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '@/db/client'
import { clientTag, gig, gigInterest, submission, workerProfile } from '@/db/schema'
import { GIG_STATUSES, PLATFORMS, type SUBMISSION_STATUSES, TASK_TYPES } from '@/db/schema/enums'
import { queueBulkEmail } from '@/emails/send-email'
import { formatMoney, rupeesToPaise } from '@/lib/format'
import { audit, notify } from '@/lib/server/activity'
import { workerBlockReason } from '@/features/accounts/cooldowns'
import { evaluateWorker, gigFacts, loadEligibility, logBlocks } from '@/features/accounts/server/eligibility'
import { AppError, adminMiddleware } from '@/lib/server/middleware'
import { slugify } from '@/lib/slug'
import { facet, orderByFrom, pageArgs, paginated, tableSearchSchema } from '@/lib/table-query'
import { gigFormSchemaRefined, type GigFormValues, PAID_LEVEL_KEYS } from '../schemas'
import { clientFacet, clientWhere } from '@/features/clients/client-filter'
import { rateRange } from '@/features/opportunities/server/rates'
import { loadSettings } from '@/features/settings/server/settings-store'
import type { AppSettings } from '@/features/settings/schemas'


export const gigsSearchSchema = tableSearchSchema.extend({
  status: facet(GIG_STATUSES),
  platform: facet(PLATFORMS),
  taskType: facet(TASK_TYPES),
  client: clientFacet,
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
    const byClient = clientWhere(gig.clientTagId, data.client)
    if (byClient) filters.push(byClient)
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
          payMode: gig.payMode,
          totalSlots: gig.totalSlots,
          claimedSlots: gig.claimedSlots,
          liveHoldHours: gig.liveHoldHours,
          endsAt: gig.endsAt,
          createdAt: gig.createdAt,
          priority: gig.priority,
          pending,
          approved,
          clientId: clientTag.id,
          clientName: clientTag.name,
          clientColor: clientTag.color,
        })
        .from(gig)
        .leftJoin(clientTag, eq(clientTag.id, gig.clientTagId))
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
    const [interest] = await context.db
      .select({ n: count() })
      .from(gigInterest)
      .where(and(eq(gigInterest.gigId, data.id), eq(gigInterest.status, 'interested')))
    const [money] = await context.db
      .select({
        spent: sql<number>`coalesce(sum(case when ${submission.status} = 'approved' then ${submission.payoutAmount} else 0 end), 0)`,
        committed: sql<number>`coalesce(sum(case when ${submission.status} not in ('rejected','expired','withdrawn') then ${submission.payoutAmount} else 0 end), 0)`,
      })
      .from(submission)
      .where(eq(submission.gigId, data.id))
    const range = rateRange(row, await loadSettings(context.db))
    const client = row.clientTagId
      ? await context.db.select({ name: clientTag.name, color: clientTag.color }).from(clientTag).where(eq(clientTag.id, row.clientTagId)).get()
      : null
    return {
      gig: row,
      interested: interest?.n ?? 0,
      money: {
        spent: Number(money?.spent ?? 0),
        committed: Number(money?.committed ?? 0),
        min: range.min,
        max: range.max,
        // Total spend is no longer a fixed multiplication (R30): worst case = top rate × open slots + what's already locked in.
        maxExposure: Number(money?.committed ?? 0) + range.max * Math.max(0, row.totalSlots - row.claimedSlots),
      },
      client: client ?? null,
      counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) as Partial<
        Record<(typeof SUBMISSION_STATUSES)[number], number>
      >,
    }
  })

/** The interest window starts the moment a gig first goes live (R12). */
const windowEnd = (minutes: number) => new Date(Date.now() + minutes * 60_000)

function toRow(v: GigFormValues, settings: AppSettings) {
  const overrides = Object.fromEntries(
    PAID_LEVEL_KEYS.flatMap((l) => (v.levelOverrides[l].trim() ? [[l, rupeesToPaise(Number(v.levelOverrides[l]))]] : [])),
  ) as Partial<Record<(typeof PAID_LEVEL_KEYS)[number], number>>
  const levelPriced = v.payMode === 'levels'
  const shape = { payMode: v.payMode, levelRateOverrides: Object.keys(overrides).length ? overrides : null, taskType: v.taskType, platform: v.platform }
  // Level-priced gigs store their top rate as payoutAmount so sorting and emails show "up to".
  const payoutAmount = levelPriced ? rateRange({ ...shape, payoutAmount: 0 }, settings).max : rupeesToPaise(v.payoutRupees)
  return {
    title: v.title,
    platform: v.platform,
    taskType: v.taskType,
    brief: v.brief,
    targetUrl: v.targetUrl || null,
    community: v.community || null,
    clientTagId: v.clientTagId || null,
    contentGuidelines: v.contentGuidelines || null,
    sampleContent: v.sampleContent || null,
    reviewChecklist: v.reviewChecklist,
    payoutAmount,
    payMode: v.payMode,
    levelRateOverrides: levelPriced && Object.keys(overrides).length ? overrides : null,
    totalSlots: v.totalSlots,
    claimWindowHours: v.claimWindowHours,
    interestWindowMinutes: v.interestWindowMinutes,
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

function payLabel(g: typeof gig.$inferSelect, settings: AppSettings) {
  const r = rateRange(g, settings)
  return r.min === r.max ? formatMoney(r.min) : `${formatMoney(r.min)}–${formatMoney(r.max)} depending on your account`
}

/**
 * Tells every approved worker who has an account that passes the rules (§5), in-app and by email
 * (if they opted in). Workers kept out by a cooldown are logged with the rule (R20).
 */
async function announceGig(db: Db, g: typeof gig.$inferSelect) {
  const workers = await db
    .select({ userId: workerProfile.userId, email: workerProfile.email, emailPrefs: workerProfile.emailPrefs })
    .from(workerProfile)
    .where(eq(workerProfile.status, 'approved'))
  const now = new Date()
  const facts = gigFacts(g)
  const ctx = await loadEligibility(db, workers.map((w) => w.userId))
  const eligible: typeof workers = []
  const blocked: Parameters<typeof logBlocks>[3] = []
  for (const w of workers) {
    const evals = evaluateWorker(ctx, w.userId, facts, now)
    const reason = workerBlockReason(evals, now)
    if (!reason) {
      eligible.push(w)
      continue
    }
    // Missing platform/state isn't a cooldown — not worth a log line per worker.
    if (reason.rule === 'platform' || reason.rule === 'state') continue
    const ev = evals.find((e) => [...e.hard, ...e.soft].some((b) => b.rule === reason.rule))
    const b = ev && [...ev.hard, ...ev.soft].find((x) => x.rule === reason.rule)
    if (b) blocked.push({ workerId: w.userId, accountId: ev.accountId, block: b })
  }
  await logBlocks(db, 'broadcast', g.id, blocked)
  await notify(
    db,
    eligible.map((w) => ({ userId: w.userId, title: `New gig: ${g.title}`, body: 'Open it to say you’re interested.', href: `/w/gigs/${g.id}` })),
  )
  queueBulkEmail({
    to: eligible.filter((w) => w.emailPrefs?.newGigs !== false).map((w) => w.email),
    template: 'newGig',
    data: { title: g.title, platform: g.platform, payout: g.payoutAmount, gigId: g.id, windowMinutes: g.interestWindowMinutes, payLabel: payLabel(g, ctx.settings) },
  })
  return eligible.length
}

/**
 * When a gig closes, workers still waiting on it hear back once instead of the gig lingering in
 * their bell and alerts. Paused gigs keep their hands up: they may reopen.
 */
async function releaseWaitingHands(db: Db, g: { id: string; title: string }) {
  const waiting = await db
    .update(gigInterest)
    .set({ status: 'not_selected', updatedAt: new Date() })
    .where(and(eq(gigInterest.gigId, g.id), eq(gigInterest.status, 'interested')))
    .returning({ workerId: gigInterest.workerId })
  await notify(
    db,
    waiting.map((w) => ({ userId: w.workerId, title: `“${g.title}” has closed`, body: 'Thanks for raising your hand. Keep an eye out for the next one.', href: '/w/gigs' })),
  )
}

export const saveGig = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(gigFormSchemaRefined.and(z.object({ id: z.string().optional() })))
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const { id, notifyWorkers, ...form } = data
    const values = toRow({ ...form, notifyWorkers }, await loadSettings(db))
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
        .set({
          ...values,
          publishedAt: values.status === 'live' ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
          interestClosesAt:
            values.status === 'live' && !existing.publishedAt ? windowEnd(values.interestWindowMinutes) : existing.interestClosesAt,
        })
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
          interestClosesAt: values.status === 'live' ? windowEnd(values.interestWindowMinutes) : null,
        })
        .returning()
    }
    if (!saved) throw new AppError('BAD_REQUEST', 'Could not save gig.')

    let notified = 0
    if (saved.status === 'live' && !wasLive && notifyWorkers) notified = await announceGig(db, saved)
    if (saved.status === 'closed') await releaseWaitingHands(db, saved)
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
        .set({
          status: data.status,
          publishedAt: firstPublish ? new Date() : t.publishedAt,
          interestClosesAt: firstPublish ? windowEnd(t.interestWindowMinutes) : t.interestClosesAt,
        })
        .where(eq(gig.id, t.id))
        .returning()
      if (firstPublish && updated && data.notifyWorkers !== false) notified += await announceGig(db, updated)
      if (data.status === 'closed' && t.status !== 'closed') await releaseWaitingHands(db, t)
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
    const { id: _id, slug: _slug, createdAt: _c, updatedAt: _u, publishedAt: _p, claimedSlots: _cs, interestClosesAt: _ic, ...rest } = src
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
