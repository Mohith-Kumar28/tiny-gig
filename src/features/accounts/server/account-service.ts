import { and, eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { socialAccount } from '@/db/schema'
import type { AccountPlatform } from '@/db/schema/enums'
import { audit } from '@/lib/server/activity'
import { AppError } from '@/lib/server/middleware'
import { accountUrl, parseHandle } from '../rules'
import { syncProfileMirror } from './mirror'

export type NewAccount = {
  workerId: string
  platform: AccountPlatform
  /** Profile URL or bare handle. */
  input: string
  createdOn?: Date | null
  karma?: number | null
  actorId: string
  /** Admin-entered creation dates count as confirmed. */
  confirmed?: boolean
}

/**
 * Adds an account to the register. One handle per platform, ever (R50): a second
 * worker can't register it, which also protects an honest owner from impersonation.
 */
export async function createAccount(db: Db, a: NewAccount) {
  const handle = parseHandle(a.platform, a.input)
  if (!handle) throw new AppError('BAD_REQUEST', 'That doesn’t look like a profile link. Paste the full link to the profile.')
  const taken = await db
    .select({ id: socialAccount.id, workerId: socialAccount.workerId })
    .from(socialAccount)
    .where(and(eq(socialAccount.platform, a.platform), eq(socialAccount.handle, handle)))
    .get()
  if (taken) {
    throw new AppError(
      'CONFLICT',
      taken.workerId === a.workerId
        ? 'This account is already on the list.'
        : 'This account is already registered on TinyGig by someone else. If it is yours, contact support.',
    )
  }
  const now = new Date()
  const [row] = await db
    .insert(socialAccount)
    .values({
      workerId: a.workerId,
      platform: a.platform,
      handle,
      url: accountUrl(a.platform, handle),
      createdOn: a.createdOn ?? null,
      createdOnConfirmedAt: a.confirmed && a.createdOn ? now : null,
      createdOnConfirmedBy: a.confirmed && a.createdOn ? a.actorId : null,
      karma: a.karma ?? null,
      karmaUpdatedAt: a.karma == null ? null : now,
      addedBy: a.actorId,
    })
    .returning()
  if (!row) throw new AppError('CONFLICT', 'Could not add the account.')
  await audit(db, {
    actorId: a.actorId,
    action: 'account.created',
    entityType: 'social_account',
    entityId: row.id,
    meta: { field: 'created', from: null, to: handle },
  })
  if (a.platform === 'reddit') await syncProfileMirror(db, a.workerId)
  return row
}
