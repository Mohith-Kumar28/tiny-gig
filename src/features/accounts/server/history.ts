import { and, inArray, isNotNull, type SQL } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { inChunks } from '@/db/in-chunks'
import { submission } from '@/db/schema'
import type { WorkRow } from '../cooldowns'

export type { WorkRow }

export async function loadWork(db: Db, scope: { workerIds?: string[] } = {}): Promise<WorkRow[]> {
  const { workerIds } = scope
  const rows = workerIds
    ? await inChunks(db, workerIds, (ids) => selectWork(db, inArray(submission.workerId, ids)))
    : await selectWork(db)
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

function selectWork(db: Db, filter?: SQL) {
  return db
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
    .where(and(isNotNull(submission.accountId), filter))
}

export { countsAsWork as countsAsClientWork } from '../cooldowns'
