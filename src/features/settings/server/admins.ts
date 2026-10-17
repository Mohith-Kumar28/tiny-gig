import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { session, user } from '@/db/schema'
import { queueEmail } from '@/emails/send-email'
import { adminEmails, appUrl } from '@/lib/env'
import { audit } from '@/lib/server/activity'
import { AppError, adminMiddleware } from '@/lib/server/middleware'
import { invitedAdminEmails, saveInvitedAdminEmails } from './admin-store'

export type AdminRow = {
  email: string
  name: string | null
  image: string | null
  status: 'active' | 'invited'
  owner: boolean
  isYou: boolean
  addedAt: Date | null
}

/** Everyone with admin access: owners (ADMIN_EMAILS), active admins and pending invites. */
export const listAdmins = createServerFn({ method: 'GET' })
  .middleware([adminMiddleware])
  .handler(async ({ context }): Promise<AdminRow[]> => {
    const { db } = context
    const [admins, invites] = await Promise.all([
      db
        .select({ email: user.email, name: user.name, image: user.image, createdAt: user.createdAt })
        .from(user)
        .where(eq(user.role, 'admin'))
        .orderBy(asc(user.createdAt)),
      invitedAdminEmails(db),
    ])
    const owners = adminEmails()
    const me = context.user.email.toLowerCase()
    const rows: AdminRow[] = admins.map((a) => ({
      email: a.email,
      name: a.name,
      image: a.image,
      status: 'active',
      owner: owners.includes(a.email.toLowerCase()),
      isYou: a.email.toLowerCase() === me,
      addedAt: a.createdAt,
    }))
    const active = new Set(rows.map((r) => r.email.toLowerCase()))
    for (const email of [...owners, ...invites]) {
      if (active.has(email)) continue
      active.add(email)
      rows.push({ email, name: null, image: null, status: 'invited', owner: owners.includes(email), isYou: false, addedAt: null })
    }
    return rows
  })

export const addAdmin = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ email: z.email('Enter a valid email').trim().toLowerCase() }))
  .handler(async ({ data, context }) => {
    const { db } = context
    const existing = await db.query.user.findFirst({ where: sql`lower(${user.email}) = ${data.email}` })
    if (existing?.role === 'admin') throw new AppError('CONFLICT', 'This person is already an admin.')

    const invites = await invitedAdminEmails(db)
    await saveInvitedAdminEmails(db, [...invites, data.email])
    if (existing) {
      await db.update(user).set({ role: 'admin' }).where(eq(user.id, existing.id))
      // Sign them out everywhere so their next sign-in picks up admin access.
      await db.delete(session).where(eq(session.userId, existing.id))
    }
    queueEmail({
      to: data.email,
      template: 'adminInvite',
      data: { invitedBy: context.user.name || context.user.email, url: appUrl('/login') },
    })
    await audit(db, { actorId: context.user.id, action: 'admin.add', entityType: 'user', entityId: data.email })
    return { status: existing ? ('active' as const) : ('invited' as const) }
  })

export const removeAdmin = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ email: z.string().trim().toLowerCase() }))
  .handler(async ({ data, context }) => {
    const { db } = context
    if (data.email === context.user.email.toLowerCase()) throw new AppError('BAD_REQUEST', "You can't remove yourself.")
    if (adminEmails().includes(data.email)) {
      throw new AppError('BAD_REQUEST', 'Owners are set in the server config (ADMIN_EMAILS) and can’t be removed here.')
    }
    const invites = await invitedAdminEmails(db)
    await saveInvitedAdminEmails(
      db,
      invites.filter((e) => e !== data.email),
    )
    const existing = await db.query.user.findFirst({
      where: and(sql`lower(${user.email}) = ${data.email}`, eq(user.role, 'admin')),
    })
    if (existing) {
      await db.update(user).set({ role: 'worker' }).where(eq(user.id, existing.id))
      await db.delete(session).where(eq(session.userId, existing.id))
    }
    await audit(db, { actorId: context.user.id, action: 'admin.remove', entityType: 'user', entityId: data.email })
    return { ok: true }
  })
