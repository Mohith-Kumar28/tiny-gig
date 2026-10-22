import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { createdAt, id, timestamp, updatedAt } from './_helpers'
import { clientTag, socialAccount } from './accounts'
import { user } from './auth'
import {
  GIG_STATUSES,
  PAYOUT_STATUSES,
  PLATFORMS,
  SUBMISSION_ACTIONS,
  SUBMISSION_STATUSES,
  TASK_TYPES,
  WORKER_STATUSES,
} from './enums'

const userRef = (name: string) => text(name).references(() => user.id, { onDelete: 'set null' })

export type EmailPreferences = {
  newGigs: boolean
  reminders: boolean
}

export const workerProfile = sqliteTable(
  'worker_profile',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    state: text('state').notNull(),
    redditUrl: text('reddit_url').notNull(),
    redditUsername: text('reddit_username').notNull(),
    accountAgeMonths: integer('account_age_months').notNull(),
    karma: integer('karma').notNull(),
    upiId: text('upi_id').notNull(),
    referralCodeUsed: text('referral_code_used'),
    ownReferralCode: text('own_referral_code').notNull().unique(),
    xUrl: text('x_url'),
    linkedinUrl: text('linkedin_url'),
    threadsUrl: text('threads_url'),
    instagramUrl: text('instagram_url'),
    bio: text('bio'),
    languages: text('languages'),
    status: text('status', { enum: WORKER_STATUSES }).notNull().default('pending'),
    reviewNote: text('review_note'),
    reviewedBy: userRef('reviewed_by'),
    reviewedAt: timestamp('reviewed_at'),
    appliedAt: timestamp('applied_at').notNull(),
    emailPrefs: text('email_prefs', { mode: 'json' })
      .$type<EmailPreferences>()
      .notNull()
      .$defaultFn(() => ({ newGigs: true, reminders: true })),
    adminNote: text('admin_note'),
    completedCount: integer('completed_count').notNull().default(0),
    rejectedCount: integer('rejected_count').notNull().default(0),
    earnedTotal: integer('earned_total').notNull().default(0),
    lastActiveAt: timestamp('last_active_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('worker_status_idx').on(t.status),
    index('worker_state_idx').on(t.state),
    index('worker_applied_idx').on(t.appliedAt),
    index('worker_phone_idx').on(t.phone),
    index('worker_upi_idx').on(t.upiId),
    index('worker_reddit_idx').on(t.redditUsername),
  ],
)

export const gig = sqliteTable(
  'gig',
  {
    id: id(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    platform: text('platform', { enum: PLATFORMS }).notNull(),
    taskType: text('task_type', { enum: TASK_TYPES }).notNull(),
    brief: text('brief').notNull(),
    targetUrl: text('target_url'),
    community: text('community'),
    contentGuidelines: text('content_guidelines'),
    sampleContent: text('sample_content'),
    reviewChecklist: text('review_checklist', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    minKarma: integer('min_karma').notNull().default(0),
    minAccountAgeMonths: integer('min_account_age_months').notNull().default(0),
    allowedStates: text('allowed_states', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    payoutAmount: integer('payout_amount').notNull(),
    totalSlots: integer('total_slots').notNull(),
    claimedSlots: integer('claimed_slots').notNull().default(0),
    claimWindowHours: integer('claim_window_hours').notNull().default(24),
    /** How long workers get to say they're interested once the gig goes live (R12). */
    interestWindowMinutes: integer('interest_window_minutes').notNull().default(10),
    interestClosesAt: timestamp('interest_closes_at'),
    liveHoldHours: integer('live_hold_hours').notNull().default(24),
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),
    status: text('status', { enum: GIG_STATUSES }).notNull().default('draft'),
    /** Internal client this work is for (admin-only). Copied onto each assignment. */
    clientTagId: text('client_tag_id').references(() => clientTag.id, { onDelete: 'set null' }),
    priority: integer('priority').notNull().default(0),
    publishedAt: timestamp('published_at'),
    createdBy: userRef('created_by'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('gig_status_idx').on(t.status),
    index('gig_platform_idx').on(t.platform),
    index('gig_created_idx').on(t.createdAt),
  ],
)

export const submission = sqliteTable(
  'submission',
  {
    id: id(),
    gigId: text('gig_id')
      .notNull()
      .references(() => gig.id, { onDelete: 'cascade' }),
    workerId: text('worker_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status', { enum: SUBMISSION_STATUSES }).notNull().default('claimed'),
    proofUrl: text('proof_url'),
    screenshotKeys: text('screenshot_keys', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    workerNote: text('worker_note'),
    payoutAmount: integer('payout_amount').notNull(),
    claimedAt: timestamp('claimed_at').notNull(),
    dueAt: timestamp('due_at').notNull(),
    reminderSentAt: timestamp('reminder_sent_at'),
    submittedAt: timestamp('submitted_at'),
    liveCheckAt: timestamp('live_check_at'),
    decidedAt: timestamp('decided_at'),
    decidedBy: userRef('decided_by'),
    payoutId: text('payout_id'),
    revision: integer('revision').notNull().default(0),
    /** The account that did (or will do) the work. Null only for legacy rows that couldn't be matched. */
    accountId: text('account_id').references(() => socialAccount.id, { onDelete: 'set null' }),
    clientTagId: text('client_tag_id').references(() => clientTag.id, { onDelete: 'set null' }),
    /** Normalized community snapshot (e.g. "developersindia") — the gig's community may be edited later. */
    community: text('community'),
    /** When the work first became visible on the platform. Never overwritten by resubmits. */
    firstSubmittedAt: timestamp('first_submitted_at'),
    level: text('level'),
    selectedAt: timestamp('selected_at'),
    selectedBy: userRef('selected_by'),
    overrideReason: text('override_reason'),
    onBehalfBy: userRef('on_behalf_by'),
    insightsKeys: text('insights_keys', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    insightsSubmittedAt: timestamp('insights_submitted_at'),
    insightsRemindedAt: timestamp('insights_reminded_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('submission_gig_worker_uq').on(t.gigId, t.workerId),
    index('submission_status_idx').on(t.status),
    index('submission_worker_idx').on(t.workerId),
    index('submission_gig_idx').on(t.gigId),
    index('submission_due_idx').on(t.dueAt),
    index('submission_live_check_idx').on(t.liveCheckAt),
    index('submission_submitted_idx').on(t.submittedAt),
    index('submission_payout_idx').on(t.payoutId),
    index('submission_account_idx').on(t.accountId),
    index('submission_first_submitted_idx').on(t.firstSubmittedAt),
  ],
)

export const INTEREST_STATUSES = ['interested', 'selected', 'not_selected', 'withdrawn'] as const

/**
 * "I'm interested" — reserves nothing (§4.1). Staff pick one account from these.
 * A direct assignment from the roster also gets a row (status selected) so the trail is complete.
 */
export const gigInterest = sqliteTable(
  'gig_interest',
  {
    id: id(),
    gigId: text('gig_id')
      .notNull()
      .references(() => gig.id, { onDelete: 'cascade' }),
    workerId: text('worker_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Eligible accounts the worker offered for this opportunity. */
    accountIds: text('account_ids', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    status: text('status', { enum: INTEREST_STATUSES }).notNull().default('interested'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('gig_interest_uq').on(t.gigId, t.workerId), index('gig_interest_gig_idx').on(t.gigId, t.status)],
)

export const submissionEvent = sqliteTable(
  'submission_event',
  {
    id: id(),
    submissionId: text('submission_id')
      .notNull()
      .references(() => submission.id, { onDelete: 'cascade' }),
    actorId: userRef('actor_id'),
    actorRole: text('actor_role', { enum: ['admin', 'worker', 'system'] }).notNull(),
    action: text('action', { enum: SUBMISSION_ACTIONS }).notNull(),
    comment: text('comment'),
    checklist: text('checklist', { mode: 'json' }).$type<string[]>(),
    createdAt: createdAt(),
  },
  (t) => [index('submission_event_submission_idx').on(t.submissionId, t.createdAt)],
)

export const payout = sqliteTable(
  'payout',
  {
    id: id(),
    workerId: text('worker_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    status: text('status', { enum: PAYOUT_STATUSES }).notNull().default('pending'),
    upiId: text('upi_id').notNull(),
    utrReference: text('utr_reference'),
    note: text('note'),
    paidAt: timestamp('paid_at'),
    paidBy: userRef('paid_by'),
    createdBy: userRef('created_by'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('payout_worker_idx').on(t.workerId),
    index('payout_status_idx').on(t.status),
    index('payout_created_idx').on(t.createdAt),
  ],
)

export const notification = sqliteTable(
  'notification',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body'),
    href: text('href'),
    readAt: timestamp('read_at'),
    createdAt: createdAt(),
  },
  (t) => [index('notification_user_idx').on(t.userId, t.createdAt)],
)

/** Browser push subscriptions — the fastest way to reach a worker inside the interest window (§4.1). */
export const pushSubscription = sqliteTable(
  'push_subscription',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
  },
  (t) => [index('push_subscription_user_idx').on(t.userId)],
)

export const emailLog = sqliteTable(
  'email_log',
  {
    id: id(),
    to: text('to').notNull(),
    template: text('template').notNull(),
    subject: text('subject').notNull(),
    status: text('status', { enum: ['sent', 'failed', 'logged'] }).notNull(),
    providerId: text('provider_id'),
    error: text('error'),
    createdAt: createdAt(),
  },
  (t) => [index('email_log_created_idx').on(t.createdAt), index('email_log_template_idx').on(t.template)],
)

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: id(),
    actorId: userRef('actor_id'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    meta: text('meta', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index('audit_entity_idx').on(t.entityType, t.entityId), index('audit_created_idx').on(t.createdAt)],
)

export const reviewTemplate = sqliteTable('review_template', {
  id: id(),
  label: text('label').notNull(),
  body: text('body').notNull(),
  kind: text('kind', { enum: ['changes', 'reject', 'approve', 'applicant_reject'] }).notNull(),
  createdAt: createdAt(),
})

export const appSetting = sqliteTable('app_setting', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: updatedAt(),
})
