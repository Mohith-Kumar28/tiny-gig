import { eq, sql } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { workerProfile, submission } from '@/db/schema'


/** Recomputes cached per-worker stats from submissions. */
export async function refreshWorkerStats(db: Db, userId: string) {
  const [row] = await db
    .select({
      completed: sql<number>`sum(case when ${submission.status} = 'approved' then 1 else 0 end)`,
      rejected: sql<number>`sum(case when ${submission.status} = 'rejected' then 1 else 0 end)`,
      earned: sql<number>`coalesce(sum(case when ${submission.status} = 'approved' then ${submission.payoutAmount} else 0 end), 0)`,
    })
    .from(submission)
    .where(eq(submission.workerId, userId))
  await db
    .update(workerProfile)
    .set({
      completedCount: Number(row?.completed ?? 0),
      rejectedCount: Number(row?.rejected ?? 0),
      earnedTotal: Number(row?.earned ?? 0),
    })
    .where(eq(workerProfile.userId, userId))
}
