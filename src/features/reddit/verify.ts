/**
 * Pure helpers for the automatic live check: turn a proof link into a Reddit "fullname"
 * (t3_ post / t1_ comment) and turn what Reddit's API returns into a verdict.
 * No network here — see server/reddit-api.ts.
 */

export type RedditThing = { fullname: string; kind: 'post' | 'comment' }

export const VERIFY_STATES = ['live', 'removed', 'deleted', 'missing', 'wrong_author', 'unresolved', 'error'] as const
export type VerifyState = (typeof VERIFY_STATES)[number]

/** States that mean "something is wrong with this post" — flagged to staff, never auto-rejected. */
export const PROBLEM_STATES: VerifyState[] = ['removed', 'deleted', 'missing', 'wrong_author']

export type VerifyDetail = {
  author?: string | null
  score?: number
  comments?: number
  removedBy?: string | null
  subreddit?: string | null
  note?: string
}

const ID = '([a-z0-9]{2,12})'

/**
 * Accepts the link shapes people actually paste:
 *  reddit.com/r/sub/comments/POST/slug/            → post
 *  reddit.com/r/sub/comments/POST/slug/COMMENT/    → comment
 *  reddit.com/r/sub/comments/POST/comment/COMMENT/ → comment
 *  reddit.com/comments/POST, redd.it/POST          → post
 * Share links (/r/sub/s/CODE) need resolving first and return null here.
 */
export function parseRedditLink(url: string): RedditThing | null {
  let u: URL
  try {
    u = new URL(url.trim())
  } catch {
    return null
  }
  const host = u.hostname.toLowerCase().replace(/^(www|old|new|np|m|amp|sh)\./, '')
  const path = u.pathname.replace(/\/+$/, '').toLowerCase()
  if (host === 'redd.it') {
    const m = path.match(new RegExp(`^/${ID}$`))
    return m ? { fullname: `t3_${m[1]}`, kind: 'post' } : null
  }
  if (host !== 'reddit.com') return null
  const comment =
    path.match(new RegExp(`/comments/${ID}/[^/]+/${ID}$`)) ?? path.match(new RegExp(`/comments/${ID}/comment/${ID}$`)) ?? path.match(new RegExp(`/comments/${ID}/_/${ID}$`))
  if (comment) return { fullname: `t1_${comment[2]}`, kind: 'comment' }
  const post = path.match(new RegExp(`/comments/${ID}(/[^/]*)?$`))
  return post ? { fullname: `t3_${post[1]}`, kind: 'post' } : null
}

export function isShareLink(url: string) {
  return /reddit\.com\/r\/[^/]+\/s\/[A-Za-z0-9]+/i.test(url)
}

type ThingData = {
  author?: string
  removed_by_category?: string | null
  banned_by?: string | null
  selftext?: string
  body?: string
  score?: number
  num_comments?: number
  subreddit?: string
}

const REMOVED_BY: Record<string, string> = {
  moderator: 'moderators',
  automod_filtered: 'AutoModerator',
  reddit: 'Reddit’s spam filters',
  anti_evil_ops: 'Reddit admins',
  community_ops: 'Reddit admins',
  copyright_takedown: 'a copyright takedown',
  content_takedown: 'a legal takedown',
  author: 'the author',
}

/**
 * The verdict for one post/comment. `data` is the `data` object from /api/info, or null if Reddit
 * didn't return it at all. Author mismatch catches proof from the wrong account (R52).
 */
export function interpret(data: ThingData | null, expectedHandle: string | null): { state: VerifyState; detail: VerifyDetail } {
  if (!data) return { state: 'missing', detail: { note: 'Reddit has no post or comment at this link.' } }
  const detail: VerifyDetail = {
    author: data.author ?? null,
    score: data.score,
    comments: data.num_comments,
    subreddit: data.subreddit ?? null,
  }
  const cat = data.removed_by_category ?? null
  const text = data.selftext ?? data.body ?? ''
  if (cat === 'deleted' || data.author === '[deleted]' || text === '[deleted]') {
    return { state: 'deleted', detail: { ...detail, removedBy: 'the author' } }
  }
  if (cat || text === '[removed]' || data.banned_by) {
    return { state: 'removed', detail: { ...detail, removedBy: cat ? (REMOVED_BY[cat] ?? cat) : 'moderators' } }
  }
  if (expectedHandle && data.author && data.author.toLowerCase() !== expectedHandle.toLowerCase()) {
    return { state: 'wrong_author', detail: { ...detail, note: `Posted by u/${data.author}, not u/${expectedHandle}.` } }
  }
  return { state: 'live', detail }
}

export type AccountCheck = { status: 'ok' | 'suspended' | 'not_found'; karma?: number }

/** /user/NAME/about: suspended accounts say so; deleted or shadowbanned ones are 404. */
export function interpretAbout(httpStatus: number, data: { is_suspended?: boolean; total_karma?: number; link_karma?: number; comment_karma?: number } | null): AccountCheck | null {
  if (httpStatus === 404) return { status: 'not_found' }
  if (httpStatus !== 200 || !data) return null
  if (data.is_suspended) return { status: 'suspended' }
  const karma = data.total_karma ?? (data.link_karma ?? 0) + (data.comment_karma ?? 0)
  return { status: 'ok', karma }
}

export const VERIFY_LABELS: Record<VerifyState, string> = {
  live: 'Live',
  removed: 'Removed',
  deleted: 'Deleted by author',
  missing: 'Not found',
  wrong_author: 'Wrong account',
  unresolved: 'Couldn’t read the link',
  error: 'Check pending',
}
