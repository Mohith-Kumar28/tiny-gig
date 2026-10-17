import { createServerFn } from '@tanstack/react-start'
import { desc, like, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { submission, workerProfile, referralReward, gig } from '@/db/schema'
import { adminMiddleware } from '@/lib/server/middleware'


/** Sidebar badge counts. */
export const getAdminBadges = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const { db } = context
    const [[subs], [apps], [rewards]] = await Promise.all([
      db
        .select({ n: sql<number>`sum(case when ${submission.status} in ('submitted','resubmitted') or (${submission.status} = 'live_check' and ${submission.liveCheckAt} <= ${Date.now()}) then 1 else 0 end)` })
        .from(submission),
      db.select({ n: sql<number>`sum(case when ${workerProfile.status} = 'pending' then 1 else 0 end)` }).from(workerProfile),
      db.select({ n: sql<number>`sum(case when ${referralReward.status} = 'pending_review' then 1 else 0 end)` }).from(referralReward),
    ])
    return {
      needs_review: Number(subs?.n ?? 0),
      pending_applicants: Number(apps?.n ?? 0),
      rewards_pending: Number(rewards?.n ?? 0),
    }
  })

/** ⌘K palette search across workers and gigs. */
export const adminQuickSearch = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .validator(z.object({ q: z.string().trim().min(1).max(100) }))
  .handler(async ({ data, context }) => {
    const q = `%${data.q.toLowerCase()}%`
    const [workers, gigs] = await Promise.all([
      context.db
        .select({ id: workerProfile.userId, name: workerProfile.fullName, reddit: workerProfile.redditUsername, status: workerProfile.status })
        .from(workerProfile)
        .where(
          or(
            like(sql`lower(${workerProfile.fullName})`, q),
            like(sql`lower(${workerProfile.email})`, q),
            like(sql`lower(${workerProfile.redditUsername})`, q),
            like(workerProfile.phone, q),
          ),
        )
        .limit(8),
      context.db
        .select({ id: gig.id, title: gig.title, platform: gig.platform, status: gig.status })
        .from(gig)
        .where(like(sql`lower(${gig.title})`, q))
        .orderBy(desc(gig.createdAt))
        .limit(8),
    ])
    return { workers, gigs }
  })
