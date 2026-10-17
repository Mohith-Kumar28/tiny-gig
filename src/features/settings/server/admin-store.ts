import { eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { appSetting } from '@/db/schema'
import { adminEmails } from '@/lib/env'

export const ADMIN_INVITES_KEY = 'admin_invites'

/** Emails added as admins from the dashboard (in addition to ADMIN_EMAILS). */
export async function invitedAdminEmails(db: Db): Promise<string[]> {
  const row = await db.query.appSetting.findFirst({ where: eq(appSetting.key, ADMIN_INVITES_KEY) })
  return Array.isArray(row?.value) ? (row.value as string[]) : []
}

export async function saveInvitedAdminEmails(db: Db, emails: string[]) {
  const value = [...new Set(emails.map((e) => e.trim().toLowerCase()))].sort()
  await db
    .insert(appSetting)
    .values({ key: ADMIN_INVITES_KEY, value })
    .onConflictDoUpdate({ target: appSetting.key, set: { value } })
}

export async function isAdminEmail(db: Db, email: string) {
  const e = email.trim().toLowerCase()
  return adminEmails().includes(e) || (await invitedAdminEmails(db)).includes(e)
}
