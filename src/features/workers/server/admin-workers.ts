import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, inArray, isNotNull, isNull, like, or, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { clientTag, workerProfile, submission, payout, referral, socialAccount, user } from '@/db/schema'
import { INDIAN_STATES, WORKER_STATUSES } from '@/db/schema/enums'
import { queueEmail } from '@/emails/send-email'
import { audit, notify } from '@/lib/server/activity'
import { adminMiddleware, AppError } from '@/lib/server/middleware'
import { facet, orderByFrom, pageArgs, paginated, tableSearchSchema } from '@/lib/table-query'
import { clientFacet, NO_CLIENT } from '@/features/clients/client-filter'
import { syncReferee } from '@/features/referrals/server/engine'


export const workersSearchSchema = tableSearchSchema.extend({
  status: facet(WORKER_STATUSES),
  state: z.array(z.enum(INDIAN_STATES)).optional().catch(undefined),
  minKarma: z.number().int().optional().catch(undefined),
  flagged: z.boolean().optional().catch(undefined),
  /** Workers with an account tagged for any of these clients. */
  client: clientFacet,
})
export type WorkersSearch = z.infer<typeof workersSearchSchema>

export const listWorkers = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(workersSearchSchema)
  .handler(async ({ data, context }) => {
    const { db } = context
    const { limit, offset, page, perPage } = pageArgs(data)
    const filters: SQL[] = []
    if (data.status?.length) filters.push(inArray(workerProfile.status, data.status))
    if (data.state?.length) filters.push(inArray(workerProfile.state, data.state))
    if (data.minKarma != null) filters.push(sql`${workerProfile.karma} >= ${data.minKarma}`)
    if (data.q) {
      const q = `%${data.q.toLowerCase()}%`
      filters.push(
        or(
          like(sql`lower(${workerProfile.fullName})`, q),
          like(sql`lower(${workerProfile.email})`, q),
          like(sql`lower(${workerProfile.redditUsername})`, q),
          like(workerProfile.phone, q),
          like(sql`lower(${workerProfile.upiId})`, q),
        ) as SQL,
      )
    }
    if (data.flagged) {
      filters.push(
        sql`exists (select 1 from "referral" r where r."referee_id" = "worker_profile"."user_id" and r."flagged" = 1)`,
      )
    }
    if (data.client?.length) {
      const real = data.client.filter((id) => id !== NO_CLIENT)
      const parts: SQL[] = []
      if (real.length)
        parts.push(
          sql`exists (select 1 from "social_account" sa, json_each(sa."client_tag_ids") j where sa."worker_id" = "worker_profile"."user_id" and j.value in (${sql.join(
            real.map((id) => sql`${id}`),
            sql`, `,
          )}))`,
        )
      if (data.client.includes(NO_CLIENT))
        parts.push(
          sql`not exists (select 1 from "social_account" sa, json_each(sa."client_tag_ids") j where sa."worker_id" = "worker_profile"."user_id")`,
        )
      filters.push((parts.length === 1 ? parts[0] : or(...parts)) as SQL)
    }
    const where = filters.length ? and(...filters) : undefined
    const approvalRate = sql<number>`case when (${workerProfile.completedCount} + ${workerProfile.rejectedCount}) = 0 then 0 else ${workerProfile.completedCount} * 1.0 / (${workerProfile.completedCount} + ${workerProfile.rejectedCount}) end`
    const orderBy = orderByFrom(
      data.sort,
      {
        name: workerProfile.fullName,
        karma: workerProfile.karma,
        age: workerProfile.accountAgeMonths,
        appliedAt: workerProfile.appliedAt,
        completed: workerProfile.completedCount,
        earned: workerProfile.earnedTotal,
        approvalRate,
        lastActive: workerProfile.lastActiveAt,
        state: workerProfile.state,
      },
      desc(workerProfile.appliedAt),
    )

    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          userId: workerProfile.userId,
          fullName: workerProfile.fullName,
          email: workerProfile.email,
          phone: workerProfile.phone,
          state: workerProfile.state,
          redditUsername: workerProfile.redditUsername,
          redditUrl: workerProfile.redditUrl,
          karma: workerProfile.karma,
          accountAgeMonths: workerProfile.accountAgeMonths,
          upiId: workerProfile.upiId,
          status: workerProfile.status,
          appliedAt: workerProfile.appliedAt,
          completedCount: workerProfile.completedCount,
          rejectedCount: workerProfile.rejectedCount,
          earnedTotal: workerProfile.earnedTotal,
          lastActiveAt: workerProfile.lastActiveAt,
          referralCodeUsed: workerProfile.referralCodeUsed,
          approvalRate,
          image: user.image,
          flagReason: referral.flagReason,
        })
        .from(workerProfile)
        .innerJoin(user, eq(user.id, workerProfile.userId))
        .leftJoin(referral, and(eq(referral.refereeId, workerProfile.userId), eq(referral.flagged, true)))
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ n: count() }).from(workerProfile).where(where),
    ])
    // Clients across each worker's accounts, so staff can see who is set up for whom.
    const ids = rows.map((r) => r.userId)
    const [accounts, tags] = ids.length
      ? await Promise.all([
          db
            .select({ workerId: socialAccount.workerId, clientTagIds: socialAccount.clientTagIds })
            .from(socialAccount)
            .where(inArray(socialAccount.workerId, ids)),
          db.select({ id: clientTag.id, name: clientTag.name, color: clientTag.color }).from(clientTag),
        ])
      : [[], []]
    const tagById = new Map(tags.map((t) => [t.id, t]))
    const clientsOf = new Map<string, Set<string>>()
    for (const a of accounts) {
      const set = clientsOf.get(a.workerId) ?? new Set<string>()
      for (const id of a.clientTagIds ?? []) set.add(id)
      clientsOf.set(a.workerId, set)
    }
    const withClients = rows.map((r) => ({
      ...r,
      clients: [...(clientsOf.get(r.userId) ?? [])].flatMap((id) => tagById.get(id) ?? []),
    }))
    return paginated(withClients, totalRow?.n ?? 0, page, perPage)
  })

export const getWorkerStatusCounts = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const rows = await context.db
      .select({ status: workerProfile.status, n: count() })
      .from(workerProfile)
      .groupBy(workerProfile.status)
    return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<(typeof WORKER_STATUSES)[number], number>>
  })

export const getWorkerDetail = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data, context }) => {
    const { db } = context
    const profile = await db.query.workerProfile.findFirst({ where: eq(workerProfile.userId, data.userId) })
    if (!profile) throw new AppError('NOT_FOUND', 'Worker not found.')
    const [account, statusCounts, payouts, referredBy, referrals, accounts] = await Promise.all([
      db.query.user.findFirst({ where: eq(user.id, data.userId) }),
      db
        .select({ status: submission.status, n: count() })
        .from(submission)
        .where(eq(submission.workerId, data.userId))
        .groupBy(submission.status),
      db.query.payout.findMany({
        where: eq(payout.workerId, data.userId),
        orderBy: desc(payout.createdAt),
        limit: 20,
      }),
      db
        .select({ referral, referrerName: workerProfile.fullName })
        .from(referral)
        .leftJoin(workerProfile, eq(workerProfile.userId, referral.referrerId))
        .where(eq(referral.refereeId, data.userId))
        .limit(1),
      db
        .select({ referral, name: workerProfile.fullName, status: workerProfile.status })
        .from(referral)
        .leftJoin(workerProfile, eq(workerProfile.userId, referral.refereeId))
        .where(eq(referral.referrerId, data.userId)),
      db.select().from(socialAccount).where(eq(socialAccount.workerId, data.userId)).orderBy(socialAccount.createdAt),
    ])
    return {
      accounts,
      profile,
      account: account ? { banned: account.banned, createdAt: account.createdAt, image: account.image } : null,
      statusCounts: Object.fromEntries(statusCounts.map((r) => [r.status, r.n])) as Record<string, number>,
      payouts,
      referredBy: referredBy[0] ?? null,
      referrals,
    }
  })

export const decideApplicants = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      userIds: z.array(z.string()).min(1).max(200),
      decision: z.enum(['approve', 'reject']),
      note: z.string().trim().max(1000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { db, user: admin } = context
    if (data.decision === 'reject' && !data.note) throw new AppError('BAD_REQUEST', 'Add a reason for rejecting.')
    const targets = await db.query.workerProfile.findMany({
      where: inArray(workerProfile.userId, data.userIds),
    })
    const status = data.decision === 'approve' ? ('approved' as const) : ('rejected' as const)
    const now = new Date()
    await db
      .update(workerProfile)
      .set({ status, reviewNote: data.note ?? null, reviewedBy: admin.id, reviewedAt: now })
      .where(inArray(workerProfile.userId, targets.map((t) => t.userId)))
    if (status === 'approved' && targets.length) {
      // Approving means the reviewer checked the profile's cake day by eye (R27).
      await db
        .update(socialAccount)
        .set({ createdOnConfirmedAt: now, createdOnConfirmedBy: admin.id })
        .where(
          and(
            inArray(socialAccount.workerId, targets.map((t) => t.userId)),
            isNull(socialAccount.createdOnConfirmedAt),
            isNotNull(socialAccount.createdOn),
          ),
        )
    }

    await notify(
      db,
      targets.map((t) => ({
        userId: t.userId,
        title: status === 'approved' ? 'Your application was approved 🎉' : 'Your application was not approved',
        body: data.note,
        href: status === 'approved' ? '/w' : '/pending',
      })),
    )
    for (const t of targets) {
      if (status === 'approved') {
        queueEmail({ to: t.email, template: 'applicationApproved', data: { name: t.fullName } })
      } else {
        queueEmail({ to: t.email, template: 'applicationRejected', data: { name: t.fullName, reason: data.note } })
      }
      await audit(db, {
        actorId: admin.id,
        action: `applicant.${data.decision}`,
        entityType: 'worker',
        entityId: t.userId,
        meta: data.note ? { note: data.note } : undefined,
      })
      await syncReferee(db, t.userId)
    }
    return { updated: targets.length }
  })

export const setWorkerStatus = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      userId: z.string(),
      status: z.enum(['approved', 'suspended', 'pending', 'rejected']),
      note: z.string().trim().max(1000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await context.db
      .update(workerProfile)
      .set({ status: data.status, reviewNote: data.note ?? null, reviewedBy: context.user.id, reviewedAt: new Date() })
      .where(eq(workerProfile.userId, data.userId))
    await audit(context.db, {
      actorId: context.user.id,
      action: `worker.status.${data.status}`,
      entityType: 'worker',
      entityId: data.userId,
      meta: data.note ? { note: data.note } : undefined,
    })
    return { ok: true }
  })

export const updateAdminNote = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ userId: z.string(), note: z.string().max(4000) }))
  .handler(async ({ data, context }) => {
    await context.db
      .update(workerProfile)
      .set({ adminNote: data.note || null })
      .where(eq(workerProfile.userId, data.userId))
    return { ok: true }
  })
