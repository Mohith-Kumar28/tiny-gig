import { env } from '@/lib/env'

type PushEnv = { VAPID_PUBLIC_KEY?: string; VAPID_PRIVATE_KEY?: string; VAPID_SUBJECT?: string; ADMIN_EMAILS?: string }

/** VAPID keys are optional: without them push is simply off. */
export const pushEnv = () => env as unknown as PushEnv
