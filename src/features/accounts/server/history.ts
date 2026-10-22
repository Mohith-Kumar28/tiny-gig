import { and, inArray, isNotNull, type SQL } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { submission } from '@/db/schema'
import type { WorkRow } from '../cooldowns'

export type { WorkRow }

export async function loadWork(db: Db, scope: { workerIds?: string[]; accountIds?: string[] } = {}): Promise<WorkRow[]> {
  const filters: SQL[] = [isNotNull(submission.accountId)]
  if (scope.workerIds) {
    if (!scope.workerIds.length) return []
    filters.push(inArray(submission.workerId, scope.workerIds))
  }
  if (scope.accountIds) {
    if (!scope.accountIds.length) return []
    filters.push(inArray(submission.accountId, scope.accountIds))
  }
  const rows = await db
    .select({
      id: submission.id,
      gigId: submission.gigId,
      workerId: submission.workerId,
      accountId: submission.accountId,
      clientTagId: submission.clientTagId,
      community: submission.community,
      status: submission.status,
      firstSubmittedAt: submission.firstSubmittedAt,
      selectedAt: submission.selectedAt,
      claimedAt: submission.claimedAt,
      decidedAt: submission.decidedAt,
    })
    .from(submission)
    .where(and(...filters))
  return rows.map((r) => ({
    id: r.id,
    gigId: r.gigId,
    workerId: r.workerId,
    accountId: r.accountId,
    clientTagId: r.clientTagId,
    community: r.community,
    status: r.status,
    at: r.firstSubmittedAt ?? r.selectedAt ?? r.claimedAt,
    posted: r.firstSubmittedAt != null,
    decidedAt: r.decidedAt,
  }))
}

export { countsAsWork as countsAsClientWork } from '../cooldowns'
