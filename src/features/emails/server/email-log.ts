import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, inArray, type SQL, sql } from 'drizzle-orm'
import { z } from 'zod'
import { emailLog } from '@/db/schema'
import { adminMiddleware } from '@/lib/server/middleware'
import { facet, orderByFrom, pageArgs, paginated, tableSearchSchema } from '@/lib/table-query'


export const emailLogSearchSchema = tableSearchSchema.extend({
  status: facet(['sent', 'failed', 'logged'] as const),
  template: z.array(z.string()).optional().catch(undefined),
})
export type EmailLogSearch = z.infer<typeof emailLogSearchSchema>

export const listEmailLog = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(emailLogSearchSchema)
  .handler(async ({ data, context }) => {
    const { limit, offset, page, perPage } = pageArgs(data)
    const filters: SQL[] = []
    if (data.status?.length) filters.push(inArray(emailLog.status, data.status))
    if (data.template?.length) filters.push(inArray(emailLog.template, data.template))
    if (data.q) {
      const q = `%${data.q.toLowerCase()}%`
      filters.push(sql`(lower(${emailLog.to}) like ${q} or lower(${emailLog.subject}) like ${q})`)
    }
    const where = filters.length ? and(...filters) : undefined
    const orderBy = orderByFrom(data.sort, { createdAt: emailLog.createdAt, to: emailLog.to }, desc(emailLog.createdAt))
    const [rows, [totalRow], templates] = await Promise.all([
      context.db.select().from(emailLog).where(where).orderBy(...orderBy).limit(limit).offset(offset),
      context.db.select({ n: count() }).from(emailLog).where(where),
      context.db.selectDistinct({ template: emailLog.template }).from(emailLog),
    ])
    return { ...paginated(rows, totalRow?.n ?? 0, page, perPage), templates: templates.map((t) => t.template) }
  })
