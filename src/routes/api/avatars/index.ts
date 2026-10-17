import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '@/lib/auth'
import { env } from '@/lib/env'
import { createId } from '@/lib/id'

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

/** Profile picture upload → R2. Returns a public URL for `user.image`. */
export const Route = createFileRoute('/api/avatars/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getAuth().api.getSession({ headers: request.headers })
        if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
        const file = (await request.formData()).get('file')
        if (!(file instanceof File)) return Response.json({ error: 'No file' }, { status: 400 })
        const ext = TYPES[file.type]
        if (!ext) return Response.json({ error: 'Use a PNG, JPG or WEBP image.' }, { status: 415 })
        if (file.size > 2 * 1024 * 1024) return Response.json({ error: 'Max 2 MB.' }, { status: 413 })
        const key = `avatars/${session.user.id}/${createId()}.${ext}`
        await env.UPLOADS.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
        return Response.json({ url: `/api/avatars/${key.slice('avatars/'.length)}` })
      },
    },
  },
})
