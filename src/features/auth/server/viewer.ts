import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { schema } from '@/db/client'
import { sessionMiddleware } from '@/lib/server/middleware'

export type Viewer = {
  user: { id: string; name: string; email: string; image: string | null; role: 'admin' | 'worker' }
  profileStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'draft'
  reviewNote: string | null
}

/** Lightweight identity used by route guards. */
export const getViewer = createServerFn({ method: 'GET' })
  .middleware([sessionMiddleware])
  .handler(async ({ context }): Promise<Viewer | null> => {
    const s = context.session
    if (!s || s.user.banned) return null
    const [profile, account] = await Promise.all([
      context.db.query.workerProfile.findFirst({
        where: eq(schema.workerProfile.userId, s.user.id),
        columns: { status: true, reviewNote: true },
      }),
      context.db.query.user.findFirst({ where: eq(schema.user.id, s.user.id), columns: { role: true, banned: true } }),
    ])
    if (!account || account.banned) return null
    return {
      user: {
        id: s.user.id,
        name: s.user.name,
        email: s.user.email,
        image: s.user.image ?? null,
        role: account.role === 'admin' ? 'admin' : 'worker',
      },
      profileStatus: profile?.status ?? 'none',
      reviewNote: profile?.reviewNote ?? null,
    }
  })
