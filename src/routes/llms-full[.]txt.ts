import { createFileRoute } from '@tanstack/react-router'
import { llmsFullTxt } from '@/features/marketing/llms-content'

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(llmsFullTxt(), {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        }),
    },
  },
})
