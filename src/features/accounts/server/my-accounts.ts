import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq } from 'drizzle-orm'
import { z } from 'zod'
import { socialAccount, submission } from '@/db/schema'
import { ACCOUNT_PLATFORMS } from '@/db/schema/enums'
import { loadSettings } from '@/features/settings/server/settings-store'
import { audit } from '@/lib/server/activity'
import { AppError, workerMiddleware } from '@/lib/server/middleware'
import { rateLimit } from '@/lib/server/rate-limit'
import { accountAgeDays, isKarmaStale, levelFor, nextLevel } from '../rules'
import { createAccount } from './account-service'
import { syncProfileMirror } from './mirror'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date')
  .refine((v) => Date.parse(`${v}T00:00:00+05:30`) <= Date.now(), 'The date can’t be in the future')
const istMs = (v: string) => Date.parse(`${v}T00:00:00+05:30`)

/**
 * The worker's own accounts. Deliberately carries no client information (R44, R45):
 * standing, level and karma belong to the account; who the work was for does not leave admin.
 */
export const listMyAccounts = createServerFn({ method: 'GET' })
  .middleware([workerMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context
    const now = new Date()
    const settings = await loadSettings(db)
    const [rows, done] = await Promise.all([
      db.select().from(socialAccount).where(eq(socialAccount.workerId, user.id)).orderBy(asc(socialAccount.createdAt)),
      db
        .select({ accountId: submission.accountId, n: count() })
        .from(submission)
        .where(and(eq(submission.workerId, user.id), eq(submission.status, 'approved')))
        .groupBy(submission.accountId),
    ])
    const doneBy = new Map(done.map((d) => [d.accountId, d.n]))
    return rows.map((a) => ({
      id: a.id,
      platform: a.platform,
      handle: a.handle,
      url: a.url,
      createdOn: a.createdOn,
      createdOnConfirmed: a.createdOnConfirmedAt != null,
      karma: a.karma,
      karmaUpdatedAt: a.karmaUpdatedAt,
      karmaStale: a.karma == null || isKarmaStale(a.karmaUpdatedAt, settings.karmaStaleDays, now),
      standing: a.standing,
      ageDays: accountAgeDays(a.createdOn, now),
      level: levelFor(a.createdOn, now),
      next: nextLevel(a.createdOn, now),
      tasksDone: doneBy.get(a.id) ?? 0,
    }))
  })

export const addMyAccount = createServerFn({ method: 'POST' })
  .middleware([workerMiddleware])
  .validator(
    z
      .object({
        platform: z.enum(ACCOUNT_PLATFORMS),
        url: z.string().trim().min(2).max(300),
        createdOn: isoDate.optional().or(z.literal('')),
        karma: z.coerce.number<string | number>().int().min(0).max(10_000_000).optional().or(z.literal('')),
      })
      .superRefine((v, ctx) => {
        if (v.platform !== 'reddit') return
        if (!v.createdOn) ctx.addIssue({ code: 'custom', path: ['createdOn'], message: 'When was this account created? Check its cake day.' })
        if (v.karma === '' || v.karma == null) ctx.addIssue({ code: 'custom', path: ['karma'], message: 'Enter the karma shown on the profile' })
      }),
  )
  .handler(async ({ data, context }) => {
    await rateLimit(`add-account:${context.user.id}`, 20, 3600)
    const row = await createAccount(context.db, {
      workerId: context.user.id,
      platform: data.platform,
      input: data.url,
      createdOn: data.createdOn ? new Date(istMs(data.createdOn)) : null,
      karma: data.karma === '' || data.karma == null ? null : data.karma,
      actorId: context.user.id,
    })
    return { id: row.id }
  })

async function ownAccount(db: Parameters<typeof createAccount>[0], userId: string, id: string) {
  const a = await db
    .select()
    .from(socialAccount)
    .where(and(eq(socialAccount.id, id), eq(socialAccount.workerId, userId)))
    .get()
  if (!a) throw new AppError('NOT_FOUND', 'Account not found.')
  return a
}

/** Karma is manual: re-entering it stamps today's date so staff know it's fresh (R26). */
export const updateMyAccount = createServerFn({ method: 'POST' })
  .middleware([workerMiddleware])
  .validator(
    z.object({
      id: z.string(),
      karma: z.number().int().min(0).max(10_000_000).optional(),
      createdOn: isoDate.optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const a = await ownAccount(db, user.id, data.id)
    const now = new Date()
    if (data.karma !== undefined) {
      await db.update(socialAccount).set({ karma: data.karma, karmaUpdatedAt: now }).where(eq(socialAccount.id, a.id))
      await audit(db, { actorId: user.id, action: 'account.karma', entityType: 'social_account', entityId: a.id, meta: { field: 'karma', from: a.karma, to: data.karma } })
    }
    if (data.createdOn !== undefined) {
      // Once staff have checked the date by eye, only staff can change it (R27).
      if (a.createdOnConfirmedAt) throw new AppError('FORBIDDEN', 'This date was confirmed by TinyGig. Ask support to correct it.')
      const ms = istMs(data.createdOn)
      await db.update(socialAccount).set({ createdOn: new Date(ms) }).where(eq(socialAccount.id, a.id))
      await audit(db, { actorId: user.id, action: 'account.createdOn', entityType: 'social_account', entityId: a.id, meta: { field: 'createdOn', from: a.createdOn?.getTime() ?? null, to: ms } })
    }
    if (a.platform === 'reddit') await syncProfileMirror(db, user.id)
    return { ok: true }
  })

/** Accounts that never did any work can be removed by their owner; anything with history stays in the register. */
export const removeMyAccount = createServerFn({ method: 'POST' })
  .middleware([workerMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context
    const a = await ownAccount(db, user.id, data.id)
    const [used] = await db.select({ n: count() }).from(submission).where(eq(submission.accountId, a.id))
    if (used?.n) throw new AppError('CONFLICT', 'This account has work history, so it stays on your list. Ask support to retire it.')
    const reddit = await db
      .select({ n: count() })
      .from(socialAccount)
      .where(and(eq(socialAccount.workerId, user.id), eq(socialAccount.platform, 'reddit')))
    if (a.platform === 'reddit' && (reddit[0]?.n ?? 0) <= 1) throw new AppError('CONFLICT', 'You need at least one Reddit account on file.')
    await db.delete(socialAccount).where(eq(socialAccount.id, a.id))
    await audit(db, { actorId: user.id, action: 'account.removed', entityType: 'social_account', entityId: a.id, meta: { field: 'removed', from: a.handle, to: null } })
    if (a.platform === 'reddit') await syncProfileMirror(db, user.id)
    return { ok: true }
  })
