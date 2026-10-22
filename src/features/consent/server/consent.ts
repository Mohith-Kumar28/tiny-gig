import { createServerFn } from '@tanstack/react-start'
import { userMiddleware } from '@/lib/server/middleware'
import { hasCurrentAccountLossConsent, recordAccountLossConsent } from './consent-service'

export const getMyConsent = createServerFn({ method: 'GET' })
  .middleware([userMiddleware])
  .handler(async ({ context }) => ({ accountLoss: await hasCurrentAccountLossConsent(context.db, context.user.id) }))

export const acceptAccountLoss = createServerFn({ method: 'POST' })
  .middleware([userMiddleware])
  .handler(async ({ context }) => {
    if (!(await hasCurrentAccountLossConsent(context.db, context.user.id))) {
      await recordAccountLossConsent(context.db, context.user.id)
    }
    return { ok: true }
  })
