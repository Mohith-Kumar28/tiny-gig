import { createFileRoute } from '@tanstack/react-router'
import { REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS } from '@/features/referrals/constants'

/** Referral link: remember the code for 30 days, then land on the homepage. */
export const Route = createFileRoute('/r/$code')({
  server: {
    handlers: {
      GET: ({ params, request }) => {
        const code = params.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
        const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
        return new Response(null, {
          status: 302,
          headers: {
            location: `/?ref=${code}`,
            'set-cookie': `${REFERRAL_COOKIE}=${code}; Path=/; Max-Age=${REFERRAL_COOKIE_DAYS * 86400}; SameSite=Lax; HttpOnly${secure}`,
          },
        })
      },
    },
  },
})
