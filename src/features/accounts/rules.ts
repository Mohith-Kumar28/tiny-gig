/**
 * Pure account rules: age, level, karma staleness, IST day keys. No DB access.
 * Age is always computed from the creation date (R25) — never stored as a number of months.
 */

export const DAY_MS = 86_400_000
const IST_OFFSET_MS = 5.5 * 3_600_000

export const LEVELS = ['warmup', 'L1', 'L2', 'L3', 'L4'] as const
export type Level = (typeof LEVELS)[number]
export type PaidLevel = Exclude<Level, 'warmup'>
export const PAID_LEVELS: PaidLevel[] = ['L1', 'L2', 'L3', 'L4']

export const LEVEL_LABELS: Record<Level, string> = {
  warmup: 'Warm-up',
  L1: 'L1',
  L2: 'L2',
  L3: 'L3',
  L4: 'L4',
}

/** Minimum age before any paid work (R24). */
export const WARMUP_DAYS = 14

/** Calendar-month arithmetic so "6 months old" means the same date six months later. */
export function addMonths(d: Date, months: number) {
  const r = new Date(d.getTime())
  r.setUTCMonth(r.getUTCMonth() + months)
  return r
}

/** When each paid level starts, relative to the creation date. */
export function levelStartsAt(createdOn: Date, level: PaidLevel): Date {
  switch (level) {
    case 'L1':
      return new Date(createdOn.getTime() + WARMUP_DAYS * DAY_MS)
    case 'L2':
      return addMonths(createdOn, 3)
    case 'L3':
      return addMonths(createdOn, 6)
    case 'L4':
      return addMonths(createdOn, 12)
  }
}

export function levelFor(createdOn: Date | null | undefined, at: Date = new Date()): Level | null {
  if (!createdOn) return null
  if (at < levelStartsAt(createdOn, 'L1')) return 'warmup'
  if (at < levelStartsAt(createdOn, 'L2')) return 'L1'
  if (at < levelStartsAt(createdOn, 'L3')) return 'L2'
  if (at < levelStartsAt(createdOn, 'L4')) return 'L3'
  return 'L4'
}

/** The next level and when the account reaches it, or null at L4. */
export function nextLevel(createdOn: Date | null | undefined, at: Date = new Date()): { level: PaidLevel; at: Date } | null {
  const current = levelFor(createdOn, at)
  if (!createdOn || !current || current === 'L4') return null
  const next = current === 'warmup' ? 'L1' : PAID_LEVELS[PAID_LEVELS.indexOf(current) + 1]
  return next ? { level: next, at: levelStartsAt(createdOn, next) } : null
}

export function accountAgeDays(createdOn: Date | null | undefined, at: Date = new Date()) {
  if (!createdOn) return null
  return Math.max(0, Math.floor((at.getTime() - createdOn.getTime()) / DAY_MS))
}

/** "3y 2m", "5m", "12d" */
export function formatAge(days: number | null) {
  if (days == null) return '—'
  if (days < 31) return `${days}d`
  const months = Math.floor(days / 30.44)
  if (months < 12) return `${months}m`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m ? `${y}y ${m}m` : `${y}y`
}

export function isKarmaStale(updatedAt: Date | null | undefined, staleDays: number, at: Date = new Date()) {
  if (!updatedAt) return true
  return at.getTime() - updatedAt.getTime() > staleDays * DAY_MS
}

/** "r/DevelopersIndia/", "https://reddit.com/r/foo" → "developersindia". */
export function normalizeCommunity(c: string | null | undefined): string | null {
  if (!c) return null
  const s = c
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.|old\.)?reddit\.com\//, '')
    .replace(/^\/?r\//, '')
    .replace(/[/\s]+$/, '')
    .split(/[/?#]/)[0]
  return s || null
}

export function communityLabel(c: string) {
  return /^[a-z0-9_]+$/.test(c) ? `r/${c}` : c
}

/** Indian calendar day ("2026-10-22") — "day" in every rule means IST (R17). */
export function istDayKey(d: Date) {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
}

/** Start of the next IST day after `d`. */
export function nextIstMidnight(d: Date) {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS)
  shifted.setUTCHours(24, 0, 0, 0)
  return new Date(shifted.getTime() - IST_OFFSET_MS)
}

export function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS)
}

/** Profile URL for an account. */
export function accountUrl(platform: string, handle: string) {
  switch (platform) {
    case 'reddit':
      return `https://www.reddit.com/user/${handle}`
    case 'x':
      return `https://x.com/${handle}`
    case 'linkedin':
      return `https://www.linkedin.com/in/${handle}`
    case 'threads':
      return `https://www.threads.net/@${handle}`
    case 'instagram':
      return `https://www.instagram.com/${handle}`
    case 'facebook':
      return `https://www.facebook.com/${handle}`
    default:
      return handle
  }
}

export function accountLabel(platform: string, handle: string) {
  if (platform === 'reddit') return `u/${handle}`
  if (platform === 'linkedin' || platform === 'facebook') return handle
  return `@${handle}`
}

/** Parse a handle out of a profile URL (or accept a bare handle). */
export function parseHandle(platform: string, input: string): string | null {
  const s = input.trim()
  if (!s) return null
  if (platform === 'reddit') {
    const m = s.match(/reddit\.com\/(?:u|user)\/([A-Za-z0-9_-]{3,20})/i) ?? s.match(/^(?:\/?u\/)?([A-Za-z0-9_-]{3,20})\/?$/)
    return m?.[1]?.toLowerCase() ?? null
  }
  const bare = s
    .replace(/^https?:\/\//, '')
    .replace(/^(www\.|m\.)/, '')
    .replace(/^[^/]+\.[a-z]+\//i, '')
    .replace(/^in\//, '')
    .split(/[/?#]/)[0]
    ?.replace(/^@/, '')
  return bare && /^[A-Za-z0-9._-]{1,60}$/.test(bare) ? bare.toLowerCase() : null
}
