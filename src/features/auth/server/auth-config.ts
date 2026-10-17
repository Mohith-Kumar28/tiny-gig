import { createServerFn } from '@tanstack/react-start'
import { env } from '@/lib/env'

export const getAuthConfig = createServerFn({ method: 'GET' }).handler(() => ({
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  devEmails: !env.RESEND_API_KEY,
}))
