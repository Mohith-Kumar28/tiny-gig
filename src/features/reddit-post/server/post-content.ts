import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { gig, submission } from '@/db/schema'
import { audit, notify } from '@/lib/server/activity'
import { adminMiddleware, AppError } from '@/lib/server/middleware'
import { normalizeCommunity, redditPostSchema } from '../post'

/** Statuses where the worker hasn't posted yet, so a change to the content is worth a ping. */
const STILL_TO_POST = new Set(['claimed', 'changes_requested'])

export const savePostContent = createServerFn({ method: 'POST' })
  .middleware([adminMiddleware])
  .validator(z.object({ submissionId: z.string(), post: redditPostSchema }))
  .handler(async ({ data, context }) => {
    const { db } = context
    const row = await db
      .select({
        id: submission.id,
        workerId: submission.workerId,
        status: submission.status,
        postContent: submission.postContent,
        title: gig.title,
      })
      .from(submission)
      .innerJoin(gig, eq(gig.id, submission.gigId))
      .where(eq(submission.id, data.submissionId))
      .get()
    if (!row) throw new AppError('NOT_FOUND', 'Assignment not found.')
    const post = { ...data.post, community: normalizeCommunity(data.post.community) }
    await db.update(submission).set({ postContent: post, updatedAt: new Date() }).where(eq(submission.id, row.id))
    await audit(db, {
      actorId: context.user.id,
      action: 'submission.post_content',
      entityType: 'submission',
      entityId: row.id,
      meta: { kind: post.kind, community: post.community },
    })
    if (STILL_TO_POST.has(row.status)) {
      await notify(db, [
        {
          userId: row.workerId,
          title: row.postContent ? `Post updated: ${row.title}` : `Your post is ready: ${row.title}`,
          body: 'Open the task to see exactly what to post.',
          href: `/w/work/${row.id}`,
        },
      ])
    }
    return { ok: true }
  })
