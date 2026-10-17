import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, emailOTP } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { getDb, schema } from '@/db/client'
import { sendEmail } from '@/emails/send-email'
import { adminEmails, env } from './env'

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
    account: { accountLinking: { enabled: true, trustedProviders: ['google', 'email-otp'] } },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const isAdmin = adminEmails().includes(user.email.toLowerCase())
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
