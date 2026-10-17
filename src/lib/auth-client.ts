import { adminClient, emailOTPClient, twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    adminClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = '/auth/two-factor'
      },
    }),
  ],
})
