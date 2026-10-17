import { createServerFn } from '@tanstack/react-start'
import { count, eq } from 'drizzle-orm'
import { workerProfile, referral } from '@/db/schema'
import { appUrl } from '@/lib/env'
import { AppError, userMiddleware, workerMiddleware } from '@/lib/server/middleware'
import { normalizePhone, parseRedditUsername, profileUpdateSchema } from '../schemas'


export const getMyProfile = createServerFn({ method: 'GET' })
  .middleware([userMiddleware])
  .handler(async ({ context }) => {
    const profile = await context.db.query.workerProfile.findFirst({
      where: eq(workerProfile.userId, context.user.id),
    })
    if (!profile) throw new AppError('NOT_FOUND', 'No profile yet.')
    const [refs] = await context.db
      .select({ n: count() })
      .from(referral)
      .where(eq(referral.referrerId, context.user.id))
    return {
      ...profile,
      referralLink: appUrl(`/r/${profile.ownReferralCode}`),
      referredCount: refs?.n ?? 0,
    }
  })

export const updateMyProfile = createServerFn({ method: 'POST' })
  .middleware([workerMiddleware])
  .validator(profileUpdateSchema)
  .handler(async ({ data, context }) => {
    const redditUsername = parseRedditUsername(data.redditUrl)
    if (!redditUsername) throw new AppError('BAD_REQUEST', 'Invalid Reddit profile link.')
    await context.db
      .update(workerProfile)
      .set({
        fullName: data.fullName,
        phone: normalizePhone(data.phone),
        state: data.state,
        redditUrl: `https://www.reddit.com/user/${redditUsername}`,
        redditUsername,
        accountAgeMonths: data.accountAgeMonths,
        karma: data.karma,
        upiId: data.upiId,
        xUrl: data.xUrl || null,
        linkedinUrl: data.linkedinUrl || null,
        threadsUrl: data.threadsUrl || null,
        instagramUrl: data.instagramUrl || null,
        bio: data.bio || null,
        languages: data.languages || null,
        emailPrefs: data.emailPrefs,
      })
      .where(eq(workerProfile.userId, context.user.id))
    return { ok: true }
  })
