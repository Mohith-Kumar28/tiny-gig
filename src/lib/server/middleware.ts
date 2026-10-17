import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db/client'
import { getAuth } from '@/lib/auth'

export class AppError extends Error {
  constructor(
    public code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'BAD_REQUEST' | 'RATE_LIMITED',
    message: string,
  ) {
    super(message)
  }
}

/** Resolves the session (may be null). */
export const sessionMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const session = await getAuth().api.getSession({ headers: getRequestHeaders() as unknown as Headers })
  return next({ context: { session, db: getDb() } })
})

/** Any signed-in, non-banned user. */
export const userMiddleware = createMiddleware({ type: 'function' })
  .middleware([sessionMiddleware])
  .server(async ({ next, context }) => {
    const session = context.session
    if (!session || session.user.banned) throw new AppError('UNAUTHORIZED', 'Please sign in to continue.')
    return next({ context: { user: session.user } })
  })

export const adminMiddleware = createMiddleware({ type: 'function' })
  .middleware([userMiddleware])
  .server(async ({ next, context }) => {
    // Read the role from the DB, not the cached session cookie, so removed admins lose access immediately.
    const row = await context.db.query.user.findFirst({
      where: eq(schema.user.id, context.user.id),
      columns: { role: true, banned: true },
    })
    if (row?.role !== 'admin' || row.banned) throw new AppError('FORBIDDEN', 'Admins only.')
    return next()
  })

/** Signed-in worker whose application was approved. */
export const workerMiddleware = createMiddleware({ type: 'function' })
  .middleware([userMiddleware])
  .server(async ({ next, context }) => {
    const profile = await context.db.query.workerProfile.findFirst({
      where: eq(schema.workerProfile.userId, context.user.id),
    })
    if (!profile || profile.status !== 'approved') {
      throw new AppError('FORBIDDEN', 'Your account is not approved yet.')
    }
    return next({ context: { profile } })
  })
