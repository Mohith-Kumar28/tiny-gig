import { and, inArray, isNotNull, type SQL } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { submission } from '@/db/schema'
import type { SubmissionStatus } from '@/db/schema/enums'

/** One piece of work, reduced to what the register and the cooldown rules need. */
export type WorkRow = {
  id: string
  gigId: string
  workerId: string
  accountId: string | null
  clientTagId: string | null
  community: string | null
  status: SubmissionStatus
  /** When it became visible (first submit), else when it was assigned. */
  at: Date
  posted: boolean
  decidedAt: Date | null
}

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

/** Work that counts as "client work" for gaps: posted, or assigned and not abandoned. */
export function countsAsClientWork(w: WorkRow) {
  return w.posted || !['expired', 'withdrawn'].includes(w.status)
}
