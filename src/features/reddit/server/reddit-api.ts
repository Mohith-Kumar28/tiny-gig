import { eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { appSetting } from '@/db/schema'
import { env } from '@/lib/env'

/**
 * Reddit's official Data API with an app-only token (no user login needed): one request can look up
 * 100 posts/comments. Credentials come from a "script"/"web" app registered at reddit.com/prefs/apps.
 * Server-only module.
 */
type RedditEnv = { REDDIT_CLIENT_ID?: string; REDDIT_CLIENT_SECRET?: string }
export type RedditCreds = { clientId: string; clientSecret: string }
export const REDDIT_SETTING_KEY = 'reddit_api'

/** Credentials from Cloudflare secrets if set, otherwise from Admin → Settings (stored in app_setting). */
export async function loadRedditCreds(db: Db): Promise<RedditCreds | null> {
  const e = env as unknown as RedditEnv
  if (e.REDDIT_CLIENT_ID && e.REDDIT_CLIENT_SECRET) return { clientId: e.REDDIT_CLIENT_ID, clientSecret: e.REDDIT_CLIENT_SECRET }
  const row = await db.query.appSetting.findFirst({ where: eq(appSetting.key, REDDIT_SETTING_KEY) })
  const v = row?.value as Partial<RedditCreds> | undefined
  return v?.clientId && v.clientSecret ? { clientId: v.clientId, clientSecret: v.clientSecret } : null
}

const UA = 'web:tinygig-live-check:v1.0 (by TinyGig)'
const TOKEN_KEY = 'reddit:app-token'
export const redditEnvConfigured = () => Boolean((env as unknown as RedditEnv).REDDIT_CLIENT_ID)

async function fetchToken(c: RedditCreds): Promise<string> {
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${btoa(`${c.clientId}:${c.clientSecret}`)}`,
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': UA,
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`Reddit token request failed (${res.status})`)
  const body = (await res.json()) as { access_token?: string; expires_in?: number; error?: string }
  if (!body.access_token) throw new Error(`Reddit token missing${body.error ? `: ${body.error}` : ''}`)
  // Cache across requests and cron runs; refresh two minutes early.
  await env.CACHE.put(tokenKey(c), body.access_token, { expirationTtl: Math.max(60, (body.expires_in ?? 3600) - 120) })
  return body.access_token
}

// Keyed by client id so changing the credentials never reuses an old token.
const tokenKey = (c: RedditCreds) => `${TOKEN_KEY}:${c.clientId}`

async function token(c: RedditCreds, fresh = false) {
  if (!fresh) {
    const cached = await env.CACHE.get(tokenKey(c))
    if (cached) return cached
  }
  return fetchToken(c)
}

/** GET on oauth.reddit.com. Retries once with a fresh token on 401. Never throws on 4xx — returns the status. */
export async function redditGet(c: RedditCreds, path: string): Promise<{ status: number; json: unknown }> {
  let t = await token(c)
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`https://oauth.reddit.com${path}`, { headers: { authorization: `Bearer ${t}`, 'user-agent': UA } })
    if (res.status === 401 && attempt === 0) {
      t = await token(c, true)
      continue
    }
    const json = res.headers.get('content-type')?.includes('json') ? await res.json().catch(() => null) : null
    return { status: res.status, json }
  }
  throw new Error('Reddit authorization failed')
}

type Listing = { data?: { children?: { kind: string; data: Record<string, unknown> & { name?: string } }[] } }

/** Looks up to 100 fullnames per request. Missing keys = Reddit has no such post/comment. Throws on API errors. */
export async function fetchThings(c: RedditCreds, fullnames: string[]) {
  const out = new Map<string, Record<string, unknown>>()
  for (let i = 0; i < fullnames.length; i += 100) {
    const ids = fullnames.slice(i, i + 100)
    const { status, json } = await redditGet(c, `/api/info?raw_json=1&id=${ids.join(',')}`)
    if (status !== 200) throw new Error(`Reddit /api/info returned ${status}`)
    for (const c of (json as Listing)?.data?.children ?? []) if (c.data?.name) out.set(c.data.name, c.data)
  }
  return out
}

export async function fetchAbout(c: RedditCreds, handle: string) {
  const { status, json } = await redditGet(c, `/user/${encodeURIComponent(handle)}/about?raw_json=1`)
  return { status, data: (json as { data?: Record<string, unknown> } | null)?.data ?? null }
}

/** Share links (reddit.com/r/x/s/CODE) redirect to the real permalink. Best effort; null if Reddit won't say. */
export async function resolveShareLink(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual', headers: { 'user-agent': UA } })
    const loc = res.headers.get('location')
    return loc ? new URL(loc, url).toString() : null
  } catch {
    return null
  }
}

/** For the settings page: can we get a token and read the API right now? */
export async function testConnection(c: RedditCreds | null): Promise<{ ok: boolean; error?: string }> {
  if (!c) return { ok: false, error: 'Not configured' }
  try {
    await token(c, true)
    const { status } = await redditGet(c, '/api/info?id=t3_1')
    return status === 200 ? { ok: true } : { ok: false, error: `Reddit returned ${status}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
