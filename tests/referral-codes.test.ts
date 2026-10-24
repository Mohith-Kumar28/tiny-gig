import { describe, expect, it } from 'vitest'
import type { Db } from '@/db/client'
import { normalizeReferralCode, REFERRAL_CODE_MAX } from '@/features/referrals/constants'
import { referralCodeBase, referralCodeForName } from '@/features/referrals/server/codes'
import { applicationSchema } from '@/features/workers/schemas'
import { createReferralCode } from '@/lib/id'

/** A fake db where the first `takenCount` lookups find the code already in use. */
function dbWithTaken(takenCount: number) {
  let calls = 0
  const chain = { from: () => chain, where: () => chain, get: async () => (calls++ < takenCount ? { id: 'x' } : undefined) }
  return { select: () => chain } as unknown as Db
}

const LONG_NAME = 'Venkata Satya Naga Durga Prasad Rao'

describe('referral codes survive every limit', () => {
  // Every shape a generated code can take: free name, numbered, random-suffixed, short-name fallback.
  const cases: [string, Promise<string>][] = [
    ['name free', referralCodeForName(dbWithTaken(0), LONG_NAME)],
    ['name taken, numbered', referralCodeForName(dbWithTaken(98), LONG_NAME)],
    ['all numbers taken', referralCodeForName(dbWithTaken(1000), LONG_NAME)],
    ['short name', referralCodeForName(dbWithTaken(0), 'Al')],
  ]

  for (const [label, codePromise] of cases) {
    it(`${label}: fits the link, cookie and form untouched`, async () => {
      const code = await codePromise
      expect(code.length).toBeLessThanOrEqual(REFERRAL_CODE_MAX)
      expect(normalizeReferralCode(code)).toBe(code)
      expect(applicationSchema.shape.referralCode.safeParse(code).success).toBe(true)
    })
  }

  it('numbered and suffixed codes keep the full name', async () => {
    const base = referralCodeBase(LONG_NAME)
    expect(await referralCodeForName(dbWithTaken(98), LONG_NAME)).toBe(`${base}99`)
    expect((await referralCodeForName(dbWithTaken(1000), LONG_NAME)).startsWith(base)).toBe(true)
  })

  it('random codes fit too', () => {
    const code = createReferralCode()
    expect(normalizeReferralCode(code)).toBe(code)
  })

  it('cleans up typed codes the same way as links', () => {
    expect(normalizeReferralCode(' dileep-rali 303 ')).toBe('DILEEPRALI303')
  })
})
