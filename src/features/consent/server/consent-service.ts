import { getRequestHeader } from '@tanstack/react-start/server'
import { and, desc, eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { consent } from '@/db/schema'
import { ACCOUNT_LOSS } from '../disclaimer'

/** Stores who accepted which wording, when, and from where (R62). */
export async function recordAccountLossConsent(db: Db, userId: string) {
  await db.insert(consent).values({
    userId,
    kind: 'account_loss',
    version: ACCOUNT_LOSS.version,
    acceptedAt: new Date(),
    ip: getRequestHeader('cf-connecting-ip') ?? getRequestHeader('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: getRequestHeader('user-agent')?.slice(0, 300) ?? null,
  })
}

export async function hasCurrentAccountLossConsent(db: Db, userId: string) {
  const latest = await db
    .select({ version: consent.version })
    .from(consent)
    .where(and(eq(consent.userId, userId), eq(consent.kind, 'account_loss')))
    .orderBy(desc(consent.acceptedAt))
    .get()
  return latest?.version === ACCOUNT_LOSS.version
}
