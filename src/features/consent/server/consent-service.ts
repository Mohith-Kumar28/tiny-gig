import { getRequestHeader } from '@tanstack/react-start/server'
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
