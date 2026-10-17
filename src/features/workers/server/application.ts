import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { workerProfile, user } from '@/db/schema'
import { queueEmail } from '@/emails/send-email'
import { createReferralCode } from '@/lib/id'
import { AppError, userMiddleware } from '@/lib/server/middleware'
import { rateLimit } from '@/lib/server/rate-limit'
import { attributeReferral } from '@/features/referrals/server/engine'
import { REFERRAL_COOKIE } from '@/features/referrals/constants'
import { alertRecipients, loadSettings } from '@/features/settings/server/settings-store'
import { applicationSchema, normalizePhone, parseRedditUsername } from '../schemas'


/** Prefill data for the onboarding form. */
export const getOnboardingDefaults = createServerFn({ method: 'GET' })
  .middleware([userMiddleware])
  .handler(async ({ context }) => {
    const profile = await context.db.query.workerProfile.findFirst({
      where: eq(workerProfile.userId, context.user.id),
    })
    return {
      fullName: profile?.fullName ?? context.user.name ?? '',
      email: profile?.email ?? context.user.email,
      referralCode: profile?.referralCodeUsed ?? getCookie(REFERRAL_COOKIE) ?? '',
      status: profile?.status ?? null,
    }
  })

export const submitApplication = createServerFn({ method: 'POST' })
  .middleware([userMiddleware])
  .validator(applicationSchema)
  .handler(async ({ data, context }) => {
    const { db, user: me } = context
    await rateLimit(`apply:${me.id}`, 5, 3600)

    const existing = await db.query.workerProfile.findFirst({ where: eq(workerProfile.userId, me.id) })
    if (existing && existing.status !== 'rejected' && existing.status !== 'draft') {
      throw new AppError('CONFLICT', 'You have already applied.')
    }

    const redditUsername = parseRedditUsername(data.redditUrl)
    if (!redditUsername) throw new AppError('BAD_REQUEST', 'Invalid Reddit profile link.')
    const phone = normalizePhone(data.phone)
    const values = {
      fullName: data.fullName,
      email: data.email,
      phone,
      state: data.state,
      redditUrl: `https://www.reddit.com/user/${redditUsername}`,
      redditUsername,
      accountAgeMonths: data.accountAgeMonths,
      karma: data.karma,
      upiId: data.upiId,
      referralCodeUsed: data.referralCode || null,
      status: 'pending' as const,
      reviewNote: null,
      appliedAt: new Date(),
    }

    if (existing) {
      await db.update(workerProfile).set(values).where(eq(workerProfile.userId, me.id))
    } else {
      await db.insert(workerProfile).values({ ...values, userId: me.id, ownReferralCode: createReferralCode() })
    }
    if (me.name !== data.fullName) await db.update(user).set({ name: data.fullName }).where(eq(user.id, me.id))

    await attributeReferral(
      db,
      { userId: me.id, name: data.fullName, phone, upiId: data.upiId, redditUsername },
      data.referralCode,
    )

    queueEmail({ to: data.email, template: 'applicationReceived', data: { name: data.fullName } })
    const settings = await loadSettings(db)
    if (settings.applicantAlerts) queueEmail({
      to: await alertRecipients(db),
      template: 'adminNewApplicant',
      data: {
        name: data.fullName,
        email: data.email,
        reddit: `u/${redditUsername}`,
        karma: data.karma,
        ageMonths: data.accountAgeMonths,
        state: data.state,
      },
    })
    return { ok: true }
  })
