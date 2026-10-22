import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { appSetting } from '@/db/schema'
import { audit } from '@/lib/server/activity'
import { adminMiddleware } from '@/lib/server/middleware'
import { loadRedditCreds, REDDIT_SETTING_KEY, redditEnvConfigured, testConnection } from './reddit-api'
import { checkAccounts, verifySubmissions } from './verify-service'

/** Settings card: is the automatic live check connected? The secret itself never leaves the server. */
export const getRedditCheckStatus = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const creds = await loadRedditCreds(context.db)
    const result = await testConnection(creds)
    return {
      configured: !!creds,
      source: redditEnvConfigured() ? ('cloudflare' as const) : creds ? ('settings' as const) : null,
      clientIdHint: creds ? `${creds.clientId.slice(0, 4)}…` : null,
      ...result,
    }
  })

/** Paste the app's ID and secret from reddit.com/prefs/apps. Tested before it's saved. */
export const saveRedditCreds = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ clientId: z.string().trim().min(5).max(100), clientSecret: z.string().trim().min(5).max(200) }))
  .handler(async ({ data, context }) => {
    const test = await testConnection(data)
    if (!test.ok) return { ok: false, error: test.error ?? 'Reddit rejected these details' }
    await context.db
      .insert(appSetting)
      .values({ key: REDDIT_SETTING_KEY, value: data })
      .onConflictDoUpdate({ target: appSetting.key, set: { value: data } })
    await audit(context.db, { actorId: context.user.id, action: 'settings.reddit_api', entityType: 'setting', entityId: REDDIT_SETTING_KEY })
    return { ok: true }
  })

/** "Re-check now" in the review panel. */
export const recheckSubmission = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(({ data, context }) => verifySubmissions(context.db, { ids: [data.id] }))

/** "Check all accounts now" — the same sweep the daily job runs. */
export const recheckAccounts = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .handler(({ context }) => checkAccounts(context.db))
