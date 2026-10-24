import { eq } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { workerProfile } from '@/db/schema'
import { createReferralCode } from '@/lib/id'
import { REFERRAL_NAME_MAX, REFERRAL_SUFFIX_MAX } from '../constants'

/** "Ravi Kumar" → "RAVIKUMAR". Letters and digits only, so it survives being typed or read aloud. */
export function referralCodeBase(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, REFERRAL_NAME_MAX)
}

/** A worker's own referral code is their name; a number is added only when the name is taken. */
export async function referralCodeForName(db: Db, name: string) {
  const base = referralCodeBase(name)
  if (base.length < 3) return createReferralCode()
  const taken = async (code: string) =>
    !!(await db.select({ id: workerProfile.userId }).from(workerProfile).where(eq(workerProfile.ownReferralCode, code)).get())
  if (!(await taken(base))) return base
  for (let n = 2; n < 100; n++) if (!(await taken(`${base}${n}`))) return `${base}${n}`
  return `${base}${createReferralCode().slice(0, REFERRAL_SUFFIX_MAX)}`
}
