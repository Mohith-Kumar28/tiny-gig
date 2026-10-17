import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { appSetting, reviewTemplate } from '@/db/schema'
import { audit } from '@/lib/server/activity'
import { adminMiddleware } from '@/lib/server/middleware'
import { reviewTemplateSchema, settingsSchema } from '../schemas'
import { loadSettings, SETTINGS_KEY } from './settings-store'


export const getSettings = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(({ context }) => loadSettings(context.db))

export const saveSettings = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(settingsSchema)
  .handler(async ({ data, context }) => {
    await context.db
      .insert(appSetting)
      .values({ key: SETTINGS_KEY, value: data })
      .onConflictDoUpdate({ target: appSetting.key, set: { value: data } })
    await audit(context.db, { actorId: context.user.id, action: 'settings.update', entityType: 'settings', entityId: SETTINGS_KEY })
    return data
  })

export const listReviewTemplates = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(({ context }) => context.db.query.reviewTemplate.findMany({ orderBy: asc(reviewTemplate.label) }))

export const saveReviewTemplate = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(reviewTemplateSchema)
  .handler(async ({ data, context }) => {
    const { id, ...values } = data
    if (id) {
      await context.db.update(reviewTemplate).set(values).where(eq(reviewTemplate.id, id))
      return { id }
    }
    const [row] = await context.db.insert(reviewTemplate).values(values).returning({ id: reviewTemplate.id })
    return { id: row?.id }
  })

export const deleteReviewTemplate = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    await context.db.delete(reviewTemplate).where(eq(reviewTemplate.id, data.id))
    return { ok: true }
  })
