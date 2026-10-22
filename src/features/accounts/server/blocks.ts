import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, gte, inArray, type SQL, sql } from 'drizzle-orm'
import { z } from 'zod'
import { blockLog, gig, socialAccount, workerProfile } from '@/db/schema'
import { adminMiddleware } from '@/lib/server/middleware'
import { orderByFrom, pageArgs, paginated, tableSearchSchema } from '@/lib/table-query'

export const blockLogSearchSchema = tableSearchSchema.extend({
  rule: z.array(z.string()).optional().catch(undefined),
  source: z.array(z.enum(['broadcast', 'interest', 'selection'])).optional().catch(undefined),
})
export type BlockLogSearch = z.infer<typeof blockLogSearchSchema>

/** Every time a limit kept someone out (R20) — to tell whether a rule protects accounts or just costs work. */
export const listBlockLog = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(blockLogSearchSchema)
  .handler(async ({ data, context }) => {
    const { db } = context
    const { limit, offset, page, perPage } = pageArgs(data)
    const filters: SQL[] = []
    if (data.rule?.length) filters.push(inArray(blockLog.rule, data.rule))
    if (data.source?.length) filters.push(inArray(blockLog.source, data.source))
    if (data.q) {
      const q = `%${data.q.toLowerCase()}%`
      filters.push(sql`(lower(${workerProfile.fullName}) like ${q} or lower(${gig.title}) like ${q} or lower(coalesce(${socialAccount.handle}, '')) like ${q})`)
    }
    const where = filters.length ? and(...filters) : undefined
    const base = db
      .select({
        id: blockLog.id,
        rule: blockLog.rule,
        detail: blockLog.detail,
        source: blockLog.source,
        unlockAt: blockLog.unlockAt,
        createdAt: blockLog.createdAt,
        workerId: blockLog.workerId,
        workerName: workerProfile.fullName,
        gigId: blockLog.gigId,
        gigTitle: gig.title,
        accountHandle: socialAccount.handle,
        accountPlatform: socialAccount.platform,
      })
      .from(blockLog)
      .leftJoin(workerProfile, eq(workerProfile.userId, blockLog.workerId))
      .leftJoin(gig, eq(gig.id, blockLog.gigId))
      .leftJoin(socialAccount, eq(socialAccount.id, blockLog.accountId))
      .where(where)
    const since = new Date(Date.now() - 30 * 86_400_000)
    const [rows, [total], byRule] = await Promise.all([
      base.orderBy(...orderByFrom(data.sort, { createdAt: blockLog.createdAt }, desc(blockLog.createdAt))).limit(limit).offset(offset),
      db
        .select({ n: count() })
        .from(blockLog)
        .leftJoin(workerProfile, eq(workerProfile.userId, blockLog.workerId))
        .leftJoin(gig, eq(gig.id, blockLog.gigId))
        .leftJoin(socialAccount, eq(socialAccount.id, blockLog.accountId))
        .where(where),
      db
        .select({ rule: blockLog.rule, n: count(), workers: sql<number>`count(distinct ${blockLog.workerId})` })
        .from(blockLog)
        .where(gte(blockLog.createdAt, since))
        .groupBy(blockLog.rule),
    ])
    return { ...paginated(rows, total?.n ?? 0, page, perPage), byRule }
  })
