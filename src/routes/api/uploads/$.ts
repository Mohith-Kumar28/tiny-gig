import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '@/lib/auth'
import { env } from '@/lib/env'

/**
 * Serves an upload. Proofs go to their owner or an admin. Post media (posts/, random keys) goes to
 * any signed-in user, since the assigned worker needs it. Supports ranges so videos can seek,
 * and ?download=name to save the file.
 */
export const Route = createFileRoute('/api/uploads/$')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const key = params._splat ?? ''
        const session = await getAuth().api.getSession({ headers: request.headers })
        if (!session) return new Response('Unauthorized', { status: 401 })
        const allowed = key.startsWith('posts/') || key.startsWith(`proofs/${session.user.id}/`) || session.user.role === 'admin'
        if (!allowed) return new Response('Forbidden', { status: 403 })
        const ranged = request.headers.has('range')
        const obj = await env.UPLOADS.get(key, ranged ? { range: request.headers } : undefined)
        if (!obj || !('body' in obj)) return new Response('Not found', { status: 404 })
        const headers = new Headers({
          'content-type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
          'cache-control': 'private, max-age=86400',
          'accept-ranges': 'bytes',
          etag: obj.httpEtag,
        })
        const download = new URL(request.url).searchParams.get('download')
        if (download) headers.set('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(download)}`)
        const range = obj.range as { offset?: number; length?: number; suffix?: number } | undefined
        const offset = range?.suffix != null ? obj.size - range.suffix : range?.offset
        if (ranged && range && offset != null) {
          const length = range.length ?? obj.size - offset
          headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${obj.size}`)
          headers.set('content-length', String(length))
          return new Response(obj.body, { status: 206, headers })
        }
        headers.set('content-length', String(obj.size))
        return new Response(obj.body, { headers })
      },
    },
  },
})
