import { and, eq, lt, ne, sql } from 'drizzle-orm'
import type { Db } from '@/db/client'
import { gig, gigInterest, socialAccount, submission, submissionEvent, workerProfile } from '@/db/schema'
import { queueEmail } from '@/emails/send-email'
import { type Block, workerBlockReason } from '@/features/accounts/cooldowns'
import { accountLabel, levelFor } from '@/features/accounts/rules'
import { evaluateWorker, gigFacts, loadEligibility, logBlocks } from '@/features/accounts/server/eligibility'
import { ACCOUNT_LOSS } from '@/features/consent/disclaimer'
import { gigClosedReason } from '@/features/gigs/eligibility'
import { formatMoney } from '@/lib/format'
import { audit, notify } from '@/lib/server/activity'
import { AppError } from '@/lib/server/middleware'
import { rateFor } from './rates'

type GigRow = typeof gig.$inferSelect

/** Evaluates one account for one gig — the same rules the worker saw, with staff-facing detail. */
export async function previewAccountForGig(db: Db, g: GigRow, accountId: string, now = new Date()) {
  const account = await db.select().from(socialAccount).where(eq(socialAccount.id, accountId)).get()
  if (!account) throw new AppError('NOT_FOUND', 'Account not found.')
  const ctx = await loadEligibility(db, [account.workerId])
  const evals = evaluateWorker(ctx, account.workerId, gigFacts(g), now)
  const evaluation = evals.find((e) => e.accountId === accountId)
  if (!evaluation) throw new AppError('NOT_FOUND', 'Account not found.')
  return { account, evaluation, settings: ctx.settings, clientName: ctx.clientName }
}

/**
 * Turns a pick into an assignment. Hard blocks can't be overridden; soft ones (cooldowns) need a
 * written reason, which is stored on the assignment and in the audit log (R10).
 * The rate is fixed here and never moves afterwards (R22).
 */
export async function assignAccount(
  db: Db,
  args: { gigId: string; accountId: string; actorId: string; overrideReason?: string; direct?: boolean },
) {
  const now = new Date()
  const g = await db.select().from(gig).where(eq(gig.id, args.gigId)).get()
  if (!g) throw new AppError('NOT_FOUND', 'Gig not found.')
  const closed = gigClosedReason(g, now)
  if (closed) throw new AppError('CONFLICT', closed)
  const { account, evaluation, settings } = await previewAccountForGig(db, g, args.accountId, now)
  if (evaluation.hard.length) throw new AppError('FORBIDDEN', `Can’t assign: ${evaluation.hard.map((b) => b.message).join('; ')}.`)
  const reason = args.overrideReason?.trim()
  if (evaluation.soft.length && (!reason || reason.length < 3)) {
    throw new AppError('BAD_REQUEST', `This pick breaks a cooldown (${evaluation.soft.map((b) => b.message).join('; ')}). Add a reason to override.`)
  }

  const reserved = await db
    .update(gig)
    .set({ claimedSlots: sql`${gig.claimedSlots} + 1` })
    .where(and(eq(gig.id, g.id), eq(gig.status, 'live'), lt(gig.claimedSlots, gig.totalSlots)))
    .returning({ claimedSlots: gig.claimedSlots })
  if (!reserved.length) throw new AppError('CONFLICT', 'All slots are already filled.')

  const level = levelFor(account.createdOn, now)
  const payoutAmount = rateFor(g, level, account.platform, settings)
  const dueAt = new Date(now.getTime() + g.claimWindowHours * 3_600_000)
  const label = accountLabel(account.platform, account.handle)
  let created: { id: string } | undefined
  try {
    ;[created] = await db
      .insert(submission)
      .values({
        gigId: g.id,
        workerId: account.workerId,
        status: 'claimed',
        payoutAmount,
        claimedAt: now,
        dueAt,
        accountId: account.id,
        clientTagId: g.clientTagId,
        community: gigFacts(g).community,
        level,
        selectedAt: now,
        selectedBy: args.actorId,
        overrideReason: evaluation.soft.length ? (reason ?? null) : null,
      })
      .returning({ id: submission.id })
    if (!created) throw new Error('insert failed')
  } catch (err) {
    await db.update(gig).set({ claimedSlots: sql`max(0, ${gig.claimedSlots} - 1)` }).where(eq(gig.id, g.id))
    throw new AppError('CONFLICT', /UNIQUE/i.test(String(err)) ? 'This worker already has this gig.' : 'Could not assign. Try again.')
  }

  await db.batch([
    db.insert(submissionEvent).values({
      submissionId: created.id,
      actorId: args.actorId,
      actorRole: 'admin',
      action: 'claimed',
      comment: `Selected ${label}`,
    }),
    db
      .insert(gigInterest)
      .values({ gigId: g.id, workerId: account.workerId, accountIds: [account.id], status: 'selected' })
      .onConflictDoUpdate({ target: [gigInterest.gigId, gigInterest.workerId], set: { status: 'selected', updatedAt: now } }),
  ])
  await audit(db, {
    actorId: args.actorId,
    action: args.direct ? 'gig.assign_direct' : 'gig.select',
    entityType: 'submission',
    entityId: created.id,
    meta: {
      gigId: g.id,
      accountId: account.id,
      level,
      payoutAmount,
      overrideReason: evaluation.soft.length ? reason : undefined,
      overridden: evaluation.soft.map((b) => b.rule),
    },
  })
  if (evaluation.soft.length) {
    await logBlocks(db, 'selection', g.id, evaluation.soft.map((b: Block) => ({ workerId: account.workerId, accountId: account.id, block: { ...b, message: `overridden: ${b.message}` } })))
  }

  const profile = await db.select({ email: workerProfile.email }).from(workerProfile).where(eq(workerProfile.userId, account.workerId)).get()
  const dueText = dueAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
  await notify(db, [
    {
      userId: account.workerId,
      title: `You’re selected: ${g.title}`,
      body: `Post from ${label} and submit the link by ${dueText}. ${ACCOUNT_LOSS.short}`,
      href: `/w/work/${created.id}`,
    },
  ])
  if (profile) {
    queueEmail({
      to: profile.email,
      template: 'selectedForGig',
      data: { title: g.title, account: label, pay: formatMoney(payoutAmount), dueAt: dueText, submissionId: created.id, disclaimer: ACCOUNT_LOSS.short },
    })
  }

  // Slots full: let everyone else know, kindly, rather than leaving them waiting.
  if ((reserved[0]?.claimedSlots ?? 0) >= g.totalSlots) {
    const others = await db
      .update(gigInterest)
      .set({ status: 'not_selected', updatedAt: now })
      .where(and(eq(gigInterest.gigId, g.id), eq(gigInterest.status, 'interested'), ne(gigInterest.workerId, account.workerId)))
      .returning({ workerId: gigInterest.workerId })
    await notify(
      db,
      others.map((o) => ({ userId: o.workerId, title: `“${g.title}” is filled`, body: 'Thanks for raising your hand. Another account was a better fit this time.', href: '/w/gigs' })),
    )
  }
  return { submissionId: created.id, payoutAmount, level }
}

export { workerBlockReason }
