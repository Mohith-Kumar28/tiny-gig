import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '@/lib/auth'
import { env } from '@/lib/env'

/** Public avatar images (keys are unguessable). DELETE removes your own. */
export const Route = createFileRoute('/api/avatars/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const obj = await env.UPLOADS.get(`avatars/${params._splat ?? ''}`)
        if (!obj) return new Response('Not found', { status: 404 })
        return new Response(obj.body, {
          headers: {
            'content-type': obj.httpMetadata?.contentType ?? 'image/webp',
            'cache-control': 'public, max-age=31536000, immutable',
          },
        })
      },
      DELETE: async ({ request, params }) => {
        const session = await getAuth().api.getSession({ headers: request.headers })
        const key = params._splat ?? ''
        if (!session || !key.startsWith(`${session.user.id}/`)) return new Response('Forbidden', { status: 403 })
        await env.UPLOADS.delete(`avatars/${key}`)
        return new Response(null, { status: 204 })
      },
    },
  },
})
