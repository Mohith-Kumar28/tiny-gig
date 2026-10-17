import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '@/lib/auth'
import { env } from '@/lib/env'
import { createId } from '@/lib/id'
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from '@/features/submissions/schemas'

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }

/** Proof screenshot upload → R2. Returns the object key to attach to a submission. */
export const Route = createFileRoute('/api/uploads/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getAuth().api.getSession({ headers: request.headers })
        if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
        const form = await request.formData()
        const file = form.get('file')
        if (!(file instanceof File)) return Response.json({ error: 'No file' }, { status: 400 })
        if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
          return Response.json({ error: 'Only PNG, JPG, WEBP or GIF images are allowed.' }, { status: 415 })
        }
        if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: 'Max file size is 5 MB.' }, { status: 413 })
        const key = `proofs/${session.user.id}/${createId()}.${EXT[file.type]}`
        await env.UPLOADS.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
        return Response.json({ key })
      },
    },
  },
})
