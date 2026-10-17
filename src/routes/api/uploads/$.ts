import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '@/lib/auth'
import { env } from '@/lib/env'

/** Serves an uploaded proof to its owner or an admin. */
export const Route = createFileRoute('/api/uploads/$')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const key = params._splat ?? ''
        const session = await getAuth().api.getSession({ headers: request.headers })
        if (!session) return new Response('Unauthorized', { status: 401 })
        const isOwner = key.startsWith(`proofs/${session.user.id}/`)
        if (!isOwner && session.user.role !== 'admin') return new Response('Forbidden', { status: 403 })
        const obj = await env.UPLOADS.get(key)
        if (!obj) return new Response('Not found', { status: 404 })
        return new Response(obj.body, {
          headers: {
            'content-type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
            'cache-control': 'private, max-age=86400',
          },
        })
      },
    },
  },
})
