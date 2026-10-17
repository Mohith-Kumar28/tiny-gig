import { createFileRoute } from '@tanstack/react-router'
import { absoluteUrl } from '@/features/marketing/seo'

const DISALLOW = ['/admin', '/w', '/api', '/onboarding', '/pending']

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        const body = [
          'User-agent: *',
          'Allow: /',
          ...DISALLOW.map((p) => `Disallow: ${p}`),
          '',
          `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
          '',
        ].join('\n')
        return new Response(body, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        })
      },
    },
  },
})
