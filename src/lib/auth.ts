import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, emailOTP, twoFactor } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db/client'
import { sendEmail } from '@/emails/send-email'
import { isAdminEmail } from '@/features/settings/server/admin-store'
import { env } from './env'

function createAuth() {
  const googleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)

  return betterAuth({
    appName: env.APP_NAME,
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: 'sqlite', schema }),
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
      storeSessionInDatabase: true,
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/email-otp/send-verification-otp': { window: 60, max: 3 },
        '/sign-in/email-otp': { window: 60, max: 10 },
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 },
        '/two-factor/verify-totp': { window: 60, max: 5 },
        '/two-factor/verify-backup-code': { window: 60, max: 5 },
      },
    },
    advanced: { ipAddress: { ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'] } },
    socialProviders: googleConfigured
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            prompt: 'select_account',
          },
        }
      : {},
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({ to: user.email, template: 'resetPassword', data: { url } })
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({ to: user.email, template: 'verifyEmail', data: { url } })
      },
    },
    user: {
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
          await sendEmail({ to: user.email, template: 'confirmEmailChange', data: { url, newEmail } })
        },
      },
    },
    account: { accountLinking: { enabled: true, trustedProviders: ['google', 'email-otp'] } },
    databaseHooks: {
      user: {
        update: {
          // Keep the worker profile's contact email in sync with the login email.
          after: async (user) => {
            await getDb()
              .update(schema.workerProfile)
              .set({ email: user.email })
              .where(eq(schema.workerProfile.userId, user.id))
          },
        },
        create: {
          before: async (user) => {
            const isAdmin = await isAdminEmail(getDb(), user.email)
            const name = user.name?.trim() || user.email.split('@')[0] || 'TinyGig user'
            return { data: { ...user, name, role: isAdmin ? 'admin' : 'worker' } }
          },
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 60 * 10,
        // Sent inline (not queued) so a delivery failure surfaces on the login screen.
        sendVerificationOTP: async ({ email, otp, type }) => {
          try {
            await sendEmail({ to: email, template: 'otp', data: { otp, type } })
          } catch (err) {
            if (env.APP_URL.startsWith('http://localhost')) {
              console.warn(`[dev] Email failed; sign-in code for ${email} is ${otp}`)
            }
            throw err
          }
        },
      }),
      admin({ defaultRole: 'worker', adminRoles: ['admin'] }),
      twoFactor({ issuer: env.APP_NAME }),
      tanstackStartCookies(),
    ],
  })
}

let cached: ReturnType<typeof createAuth> | undefined

export function getAuth() {
  cached ??= createAuth()
  return cached
}

export type Auth = ReturnType<typeof createAuth>
export type Session = Auth['$Infer']['Session']
