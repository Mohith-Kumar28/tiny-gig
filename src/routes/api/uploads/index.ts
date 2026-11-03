import { createFileRoute } from '@tanstack/react-router'
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from '@/features/submissions/schemas'
import { getAuth } from '@/lib/auth'
import { env } from '@/lib/env'
import { createId } from '@/lib/id'

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}
const POST_IMAGE_BYTES = 20 * 1024 * 1024
const POST_VIDEO_BYTES = 90 * 1024 * 1024

/**
 * Upload → R2, returning the object key. Proof screenshots go under the worker's prefix.
 * Staff uploading post media (purpose=post) go under posts/, which the assigned worker downloads.
 */
export const Route = createFileRoute('/api/uploads/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getAuth().api.getSession({ headers: request.headers })
        if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
        const isAdmin = (session.user as { role?: string }).role === 'admin'
        const form = await request.formData()
        const file = form.get('file')
        if (!(file instanceof File)) return Response.json({ error: 'No file' }, { status: 400 })

        if (form.get('purpose') === 'post') {
          if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 })
          const video = file.type.startsWith('video/')
          if (!EXT[file.type]) return Response.json({ error: 'Use PNG, JPG, WEBP, GIF, MP4, WEBM or MOV.' }, { status: 415 })
          if (file.size > (video ? POST_VIDEO_BYTES : POST_IMAGE_BYTES)) {
            return Response.json({ error: video ? 'Max video size is 90 MB.' : 'Max image size is 20 MB.' }, { status: 413 })
          }
          const key = `posts/${createId()}.${EXT[file.type]}`
          await env.UPLOADS.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
          return Response.json({ key })
        }

        if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
          return Response.json({ error: 'Only PNG, JPG, WEBP or GIF images are allowed.' }, { status: 415 })
        }
        if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: 'Max file size is 5 MB.' }, { status: 413 })
        // Staff uploading on a worker's behalf (R39) store under the worker's prefix so the worker can see it too.
        const forUser = form.get('forUser')
        const owner = typeof forUser === 'string' && forUser && isAdmin ? forUser : session.user.id
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(owner)) return Response.json({ error: 'Bad owner' }, { status: 400 })
        const key = `proofs/${owner}/${createId()}.${EXT[file.type]}`
        await env.UPLOADS.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
        return Response.json({ key })
      },
    },
  },
})
