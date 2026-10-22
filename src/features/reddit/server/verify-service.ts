import { and, asc, eq, inArray, isNotNull, isNull, lt, or } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { gig, socialAccount, submission, user } from '@/db/schema'
import { audit, notify } from '@/lib/server/activity'
import { type AccountCheck, interpret, interpretAbout, isShareLink, PROBLEM_STATES, parseRedditLink, type VerifyDetail, type VerifyState } from '../verify'
import { fetchAbout, fetchThings, loadRedditCreds, resolveShareLink } from './reddit-api'

/** Work whose post should be up right now: from the moment the link is in until a final decision. */
const WATCHED = ['submitted', 'resubmitted', 'live_check', 'on_hold', 'in_review'] as const
const RECHECK_MS = 14 * 60_000

async function adminIds(db: Db) {
  return (await db.select({ id: user.id }).from(user).where(eq(user.role, 'admin'))).map((u) => u.id)
}

/**
 * Checks Reddit posts against Reddit's API and records the verdict. Only definite answers change
 * anything; API errors leave the previous verdict alone and are retried on the next run. Problems
 * are flagged to staff once — never auto-rejected; staff keep the final say (manual override).
 */
export async function verifySubmissions(db: Db, opts: { ids?: string[]; now?: Date; limit?: number } = {}) {
  const creds = await loadRedditCreds(db)
  if (!creds) return { checked: 0, flagged: 0, skipped: 'not-configured' as const }
  const now = opts.now ?? new Date()
  const rows = await db
    .select({ sub: submission, gigTitle: gig.title, handle: socialAccount.handle })
    .from(submission)
    .innerJoin(gig, eq(gig.id, submission.gigId))
    .leftJoin(socialAccount, eq(socialAccount.id, submission.accountId))
    .where(
      and(
        eq(gig.platform, 'reddit'),
        isNotNull(submission.proofUrl),
        opts.ids?.length
          ? inArray(submission.id, opts.ids)
          : and(
              inArray(submission.status, [...WATCHED]),
              or(isNull(submission.verifyCheckedAt), lt(submission.verifyCheckedAt, new Date(now.getTime() - RECHECK_MS))),
            ),
      ),
    )
    .orderBy(asc(submission.verifyCheckedAt))
    .limit(opts.limit ?? 300)
  if (!rows.length) return { checked: 0, flagged: 0 }

  // Resolve every link to a Reddit fullname first; share links are expanded once and remembered.
  const targets: { row: (typeof rows)[number]; fullname: string | null; resolvedUrl?: string }[] = []
  for (const row of rows) {
    const known = (row.sub.verifyDetail as { fullname?: string } | null)?.fullname
    let thing = parseRedditLink(row.sub.proofUrl ?? '')
    let resolvedUrl: string | undefined
    if (!thing && known) thing = { fullname: known, kind: known.startsWith('t1_') ? 'comment' : 'post' }
    if (!thing && isShareLink(row.sub.proofUrl ?? '')) {
      const r = await resolveShareLink(row.sub.proofUrl ?? '')
      if (r) {
        thing = parseRedditLink(r)
        resolvedUrl = r
      }
    }
    targets.push({ row, fullname: thing?.fullname ?? null, resolvedUrl })
  }

  let found: Map<string, Record<string, unknown>>
  try {
    found = await fetchThings(creds, targets.flatMap((t) => (t.fullname ? [t.fullname] : [])))
  } catch (err) {
    console.error('[reddit-verify]', err)
    // Leave verdicts alone; just note the attempt so first-time rows show "check pending".
    for (const t of targets) {
      if (!t.row.sub.verifyState) await db.update(submission).set({ verifyState: 'error', verifyCheckedAt: now }).where(eq(submission.id, t.row.sub.id))
    }
    return { checked: 0, flagged: 0, error: String(err) }
  }

  const admins = await adminIds(db)
  let flagged = 0
  for (const t of targets) {
    let state: VerifyState
    let detail: VerifyDetail & { fullname?: string; resolvedUrl?: string }
    if (!t.fullname) {
      state = 'unresolved'
      detail = { note: 'Not a Reddit post or comment link we can read. Check it by hand.' }
    } else {
      const v = interpret((found.get(t.fullname) as never) ?? null, t.row.handle ?? null)
      state = v.state
      detail = { ...v.detail, fullname: t.fullname, ...(t.resolvedUrl ? { resolvedUrl: t.resolvedUrl } : {}) }
    }
    const isProblem = PROBLEM_STATES.includes(state)
    const firstFlag = isProblem && !t.row.sub.verifyFlaggedAt
    await db
      .update(submission)
      .set({
        verifyState: state,
        verifyCheckedAt: now,
        verifyDetail: detail as Record<string, string | number | boolean | null>,
        ...(state === 'live' ? { verifyLiveAt: now } : {}),
        ...(firstFlag ? { verifyFlaggedAt: now } : {}),
      })
      .where(eq(submission.id, t.row.sub.id))
    if (firstFlag) {
      flagged++
      const what =
        state === 'wrong_author'
          ? detail.note
          : state === 'removed'
            ? `Removed by ${detail.removedBy ?? 'moderators'}.`
            : state === 'deleted'
              ? 'Deleted by the author.'
              : 'Reddit can’t find it any more.'
      await notify(
        db,
        admins.map((id) => ({ userId: id, title: `Live check: ${t.row.gigTitle}`, body: `${t.row.handle ? `u/${t.row.handle}: ` : ''}${what}`, href: `/admin/review?tab=flagged&selected=${t.row.sub.id}` })),
      )
      await audit(db, { actorId: null, action: `verify.${state}`, entityType: 'submission', entityId: t.row.sub.id, meta: detail as Record<string, unknown> })
    }
  }
  return { checked: targets.length, flagged }
}

/**
 * Daily account sweep: real karma from Reddit (so the register never goes stale) and account status.
 * Suspended → banned straight away (Reddit says so explicitly). Not found (deleted or shadowbanned)
 * → lost only after two checks in a row, so one bad response can't take an account out.
 */
export async function checkAccounts(db: Db, opts: { limit?: number; now?: Date } = {}) {
  const creds = await loadRedditCreds(db)
  if (!creds) return { checked: 0, skipped: 'not-configured' as const }
  const now = opts.now ?? new Date()
  const accounts = await db
    .select()
    .from(socialAccount)
    .where(and(eq(socialAccount.platform, 'reddit'), inArray(socialAccount.standing, ['active', 'warned'])))
    .orderBy(asc(socialAccount.redditCheckedAt))
    .limit(opts.limit ?? 250)
  const admins = await adminIds(db)
  let checked = 0
  for (const a of accounts) {
    let result: AccountCheck | null
    try {
      const r = await fetchAbout(creds, a.handle)
      result = interpretAbout(r.status, r.data as never)
    } catch (err) {
      console.error('[reddit-accounts]', err)
      break // API trouble: stop and try again tomorrow rather than hammering it.
    }
    if (!result) continue
    checked++
    const patch: Partial<typeof socialAccount.$inferInsert> = { redditStatus: result.status, redditCheckedAt: now }
    if (result.status === 'ok' && result.karma != null) {
      patch.karma = result.karma
      patch.karmaUpdatedAt = now
    }
    let to: 'banned' | 'lost' | null = null
    if (result.status === 'suspended') to = 'banned'
    if (result.status === 'not_found' && a.redditStatus === 'not_found') to = 'lost'
    if (to) {
      patch.standing = to
      patch.standingNote = to === 'banned' ? 'Auto-check: Reddit reports this account as suspended.' : 'Auto-check: Reddit no longer finds this account (deleted or shadowbanned).'
    }
    await db.update(socialAccount).set(patch).where(eq(socialAccount.id, a.id))
    if (to) {
      await audit(db, { actorId: null, action: 'account.standing', entityType: 'social_account', entityId: a.id, meta: { field: 'standing', from: a.standing, to, source: 'reddit-auto-check' } })
      await notify(db, admins.map((id) => ({ userId: id, title: `u/${a.handle} is now ${to}`, body: patch.standingNote ?? undefined, href: '/admin/accounts' })))
    }
  }
  return { checked }
}
