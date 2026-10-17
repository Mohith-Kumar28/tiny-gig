import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, inArray, like, or, type SQL, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'
import { referral, referralProgram, referralReward, workerProfile } from '@/db/schema'
import { REWARD_ROLES, REWARD_STATUSES } from '@/db/schema/enums'
import { appUrl } from '@/lib/env'
import { rupeesToPaise } from '@/lib/format'
import { audit, notify } from '@/lib/server/activity'
import { AppError, adminMiddleware, workerMiddleware } from '@/lib/server/middleware'
import { facet, orderByFrom, pageArgs, paginated, tableSearchSchema } from '@/lib/table-query'
import { isProgramRunning, nextTierProgress, refereeQualifies } from '../rules'
import { programFormSchema } from '../schemas'
import { evaluateAllReferrers, evaluateReferrer } from './engine'

const referrerProfile = alias(workerProfile, 'referrer_profile')

/* ---------- Programs ---------- */

export const listPrograms = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const { db } = context
    const programs = await db.query.referralProgram.findMany({ orderBy: desc(referralProgram.createdAt) })
    const stats = await db
      .select({
        programId: referralReward.programId,
        rewards: count(),
        amount: sql<number>`sum(${referralReward.amount})`,
        pending: sql<number>`sum(case when ${referralReward.status} = 'pending_review' then 1 else 0 end)`,
      })
      .from(referralReward)
      .where(sql`${referralReward.status} != 'void'`)
      .groupBy(referralReward.programId)
    const byId = new Map(stats.map((s) => [s.programId, s]))
    return programs.map((p) => ({
      ...p,
      running: isProgramRunning(p),
      rewardsCount: byId.get(p.id)?.rewards ?? 0,
      rewardsAmount: Number(byId.get(p.id)?.amount ?? 0),
      pendingCount: Number(byId.get(p.id)?.pending ?? 0),
    }))
  })

export const saveProgram = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(programFormSchema.extend({ id: z.string().optional() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const { id, referrerRewardRupees, refereeRewardRupees, ...rest } = data
    const values = {
      name: rest.name,
      description: rest.description || null,
      active: rest.active,
      trigger: rest.trigger,
      triggerValue: rest.trigger === 'earned_at_least' ? rupeesToPaise(rest.triggerValue) : rest.triggerValue,
      threshold: rest.threshold,
      referrerReward: rupeesToPaise(referrerRewardRupees),
      refereeReward: rupeesToPaise(refereeRewardRupees),
      repeatMode: rest.repeatMode,
      maxRewardsPerReferrer: rest.maxRewardsPerReferrer === '' || rest.maxRewardsPerReferrer == null ? null : rest.maxRewardsPerReferrer,
      qualifyWithinDays: rest.qualifyWithinDays === '' || rest.qualifyWithinDays == null ? null : rest.qualifyWithinDays,
      autoApprove: rest.autoApprove,
      startsAt: rest.startsAt ? new Date(rest.startsAt) : null,
      endsAt: rest.endsAt ? new Date(rest.endsAt) : null,
    }
    if (values.referrerReward === 0 && values.refereeReward === 0) {
      throw new AppError('BAD_REQUEST', 'Set a reward for the referrer, the referee, or both.')
    }
    let programId = id
    if (id) {
      await db.update(referralProgram).set(values).where(eq(referralProgram.id, id))
    } else {
      const [row] = await db.insert(referralProgram).values({ ...values, createdBy: user.id }).returning({ id: referralProgram.id })
      programId = row?.id
    }
    await audit(db, { actorId: user.id, action: id ? 'referral_program.update' : 'referral_program.create', entityType: 'referral_program', entityId: programId ?? '' })
    return { id: programId }
  })

export const toggleProgram = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string(), active: z.boolean() }))
  .handler(async ({ data, context }) => {
    await context.db.update(referralProgram).set({ active: data.active }).where(eq(referralProgram.id, data.id))
    return { ok: true }
  })

/** Re-runs the engine for everyone — use after editing a program. */
export const reevaluateReferrals = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    await evaluateAllReferrers(context.db)
    return { ok: true }
  })

/* ---------- Referrals & rewards ---------- */

export const referralsSearchSchema = tableSearchSchema.extend({
  flagged: z.boolean().optional().catch(undefined),
  stage: facet(['signed_up', 'approved', 'first_gig'] as const),
})
export type ReferralsSearch = z.infer<typeof referralsSearchSchema>

export const listReferrals = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(referralsSearchSchema)
  .handler(async ({ data, context }) => {
    const { db } = context
    const { limit, offset, page, perPage } = pageArgs(data)
    const filters: SQL[] = []
    if (data.flagged != null) filters.push(eq(referral.flagged, data.flagged))
    if (data.stage?.length) {
      const stageSql: SQL[] = []
      if (data.stage.includes('signed_up')) stageSql.push(sql`${referral.approvedAt} is null`)
      if (data.stage.includes('approved')) stageSql.push(sql`(${referral.approvedAt} is not null and ${referral.firstGigApprovedAt} is null)`)
      if (data.stage.includes('first_gig')) stageSql.push(sql`${referral.firstGigApprovedAt} is not null`)
      filters.push(or(...stageSql) as SQL)
    }
    if (data.q) {
      const q = `%${data.q.toLowerCase()}%`
      filters.push(
        or(
          like(sql`lower(${workerProfile.fullName})`, q),
          like(sql`lower(${referrerProfile.fullName})`, q),
          like(sql`lower(${referral.code})`, q),
        ) as SQL,
      )
    }
    const where = filters.length ? and(...filters) : undefined
    const orderBy = orderByFrom(
      data.sort,
      { attributedAt: referral.attributedAt, gigsApproved: referral.gigsApproved, earned: referral.earned, referrer: referrerProfile.fullName },
      desc(referral.attributedAt),
    )
    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id: referral.id,
          code: referral.code,
          attributedAt: referral.attributedAt,
          approvedAt: referral.approvedAt,
          firstGigApprovedAt: referral.firstGigApprovedAt,
          gigsApproved: referral.gigsApproved,
          earned: referral.earned,
          flagged: referral.flagged,
          flagReason: referral.flagReason,
          refereeId: referral.refereeId,
          refereeName: workerProfile.fullName,
          refereeStatus: workerProfile.status,
          referrerId: referral.referrerId,
          referrerName: referrerProfile.fullName,
        })
        .from(referral)
        .innerJoin(workerProfile, eq(workerProfile.userId, referral.refereeId))
        .innerJoin(referrerProfile, eq(referrerProfile.userId, referral.referrerId))
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ n: count() })
        .from(referral)
        .innerJoin(workerProfile, eq(workerProfile.userId, referral.refereeId))
        .innerJoin(referrerProfile, eq(referrerProfile.userId, referral.referrerId))
        .where(where),
    ])
    return paginated(rows, totalRow?.n ?? 0, page, perPage)
  })

export const setReferralFlag = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string(), flagged: z.boolean(), reason: z.string().max(300).optional() }))
  .handler(async ({ data, context }) => {
    const { db } = context
    const [row] = await db
      .update(referral)
      .set({ flagged: data.flagged, flagReason: data.flagged ? (data.reason ?? 'Flagged by admin') : null })
      .where(eq(referral.id, data.id))
      .returning({ referrerId: referral.referrerId })
    if (row && !data.flagged) await evaluateReferrer(db, row.referrerId)
    return { ok: true }
  })

export const rewardsSearchSchema = tableSearchSchema.extend({
  status: facet(REWARD_STATUSES),
  role: facet(REWARD_ROLES),
  programId: z.string().optional().catch(undefined),
})
export type RewardsSearch = z.infer<typeof rewardsSearchSchema>

export const listRewards = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(rewardsSearchSchema)
  .handler(async ({ data, context }) => {
    const { db } = context
    const { limit, offset, page, perPage } = pageArgs(data)
    const filters: SQL[] = []
    if (data.status?.length) filters.push(inArray(referralReward.status, data.status))
    if (data.role?.length) filters.push(inArray(referralReward.role, data.role))
    if (data.programId) filters.push(eq(referralReward.programId, data.programId))
    if (data.q) filters.push(like(sql`lower(${workerProfile.fullName})`, `%${data.q.toLowerCase()}%`))
    const where = filters.length ? and(...filters) : undefined
    const orderBy = orderByFrom(
      data.sort,
      { amount: referralReward.amount, createdAt: referralReward.createdAt, worker: workerProfile.fullName },
      desc(referralReward.createdAt),
    )
    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id: referralReward.id,
          role: referralReward.role,
          tier: referralReward.tier,
          amount: referralReward.amount,
          status: referralReward.status,
          note: referralReward.note,
          createdAt: referralReward.createdAt,
          payoutId: referralReward.payoutId,
          workerId: referralReward.workerId,
          workerName: workerProfile.fullName,
          programId: referralProgram.id,
          programName: referralProgram.name,
          flagged: sql<boolean>`exists (select 1 from "referral" r where r."flagged" = 1 and (r."referee_id" = "referral_reward"."worker_id" or r."id" = "referral_reward"."referral_id"))`,
        })
        .from(referralReward)
        .innerJoin(workerProfile, eq(workerProfile.userId, referralReward.workerId))
        .innerJoin(referralProgram, eq(referralProgram.id, referralReward.programId))
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ n: count() })
        .from(referralReward)
        .innerJoin(workerProfile, eq(workerProfile.userId, referralReward.workerId))
        .where(where),
    ])
    return paginated(rows, totalRow?.n ?? 0, page, perPage)
  })

export const decideRewards = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ ids: z.array(z.string()).min(1).max(500), decision: z.enum(['approve', 'void']), note: z.string().max(300).optional() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const status = data.decision === 'approve' ? ('approved' as const) : ('void' as const)
    const rows = await db
      .update(referralReward)
      .set({ status, note: data.note ?? null, decidedBy: user.id, decidedAt: new Date() })
      .where(and(inArray(referralReward.id, data.ids), eq(referralReward.status, 'pending_review')))
      .returning({ workerId: referralReward.workerId, amount: referralReward.amount })
    if (status === 'approved') {
      await notify(
        db,
        rows.map((r) => ({ userId: r.workerId, title: 'Referral reward approved', body: 'Added to your balance', href: '/w/referrals' })),
      )
    }
    await audit(db, { actorId: user.id, action: `referral_reward.${data.decision}`, entityType: 'referral_reward', entityId: data.ids.join(','), meta: { count: rows.length } })
    return { updated: rows.length }
  })

export const getReferralStats = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const { db } = context
    const [[refs], [rewards], leaders] = await Promise.all([
      db
        .select({
          total: count(),
          approved: sql<number>`sum(case when ${referral.approvedAt} is not null then 1 else 0 end)`,
          active: sql<number>`sum(case when ${referral.firstGigApprovedAt} is not null then 1 else 0 end)`,
          flagged: sql<number>`sum(case when ${referral.flagged} = 1 then 1 else 0 end)`,
        })
        .from(referral),
      db
        .select({
          owed: sql<number>`coalesce(sum(case when ${referralReward.status} in ('approved','pending_review') then ${referralReward.amount} end), 0)`,
          paid: sql<number>`coalesce(sum(case when ${referralReward.status} = 'paid' then ${referralReward.amount} end), 0)`,
          pendingReview: sql<number>`sum(case when ${referralReward.status} = 'pending_review' then 1 else 0 end)`,
        })
        .from(referralReward),
      db
        .select({
          referrerId: referral.referrerId,
          name: referrerProfile.fullName,
          total: count(),
          approved: sql<number>`sum(case when ${referral.approvedAt} is not null then 1 else 0 end)`,
          active: sql<number>`sum(case when ${referral.firstGigApprovedAt} is not null then 1 else 0 end)`,
        })
        .from(referral)
        .innerJoin(referrerProfile, eq(referrerProfile.userId, referral.referrerId))
        .groupBy(referral.referrerId)
        .orderBy(desc(count()))
        .limit(10),
    ])
    return {
      total: refs?.total ?? 0,
      approved: Number(refs?.approved ?? 0),
      active: Number(refs?.active ?? 0),
      flagged: Number(refs?.flagged ?? 0),
      owed: Number(rewards?.owed ?? 0),
      paid: Number(rewards?.paid ?? 0),
      pendingReview: Number(rewards?.pendingReview ?? 0),
      leaders: leaders.map((l) => ({ ...l, approved: Number(l.approved), active: Number(l.active) })),
    }
  })

/* ---------- Worker ---------- */

export const getMyReferrals = createServerFn({ method: 'GET' })
  .middleware([workerMiddleware])
  .handler(async ({ context }) => {
    const { db, user, profile } = context
    const [programs, refs, rewards] = await Promise.all([
      db.query.referralProgram.findMany({ where: eq(referralProgram.active, true) }),
      db
        .select({ referral, name: workerProfile.fullName, status: workerProfile.status })
        .from(referral)
        .innerJoin(workerProfile, eq(workerProfile.userId, referral.refereeId))
        .where(eq(referral.referrerId, user.id))
        .orderBy(desc(referral.attributedAt)),
      db
        .select({ reward: referralReward, programName: referralProgram.name })
        .from(referralReward)
        .innerJoin(referralProgram, eq(referralProgram.id, referralReward.programId))
        .where(eq(referralReward.workerId, user.id))
        .orderBy(desc(referralReward.createdAt)),
    ])
    const now = new Date()
    const running = programs.filter((p) => isProgramRunning(p, now))
    return {
      code: profile.ownReferralCode,
      link: appUrl(`/r/${profile.ownReferralCode}`),
      programs: running.map((p) => {
        const qualified = refs.filter((r) => refereeQualifies(p, r.referral, now)).length
        return { ...p, qualified, progress: nextTierProgress(p, qualified) }
      }),
      referees: refs.map((r) => ({
        id: r.referral.id,
        // Show first name only to protect referee privacy.
        name: r.name.split(' ')[0] ?? r.name,
        status: r.status,
        attributedAt: r.referral.attributedAt,
        approvedAt: r.referral.approvedAt,
        firstGigApprovedAt: r.referral.firstGigApprovedAt,
        gigsApproved: r.referral.gigsApproved,
      })),
      rewards: rewards.map((r) => ({ ...r.reward, programName: r.programName })),
    }
  })
