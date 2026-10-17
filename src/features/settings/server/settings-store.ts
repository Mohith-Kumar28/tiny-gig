import { eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { appSetting, user } from '@/db/schema'
import { adminEmails } from '@/lib/env'
import { type AppSettings, DEFAULT_SETTINGS } from '../schemas'

export const SETTINGS_KEY = 'app'

export async function loadSettings(db: Db): Promise<AppSettings> {
  const row = await db.query.appSetting.findFirst({ where: eq(appSetting.key, SETTINGS_KEY) })
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<AppSettings>) ?? {}) }
}

/** Env admins + any extra alert addresses configured in settings. */
export async function alertRecipients(db: Db) {
  const s = await loadSettings(db)
  const admins = await db.select({ email: user.email }).from(user).where(eq(user.role, 'admin'))
  return [...new Set([...adminEmails(), ...admins.map((a) => a.email.toLowerCase()), ...s.alertEmails.map((e) => e.toLowerCase())])]
}
