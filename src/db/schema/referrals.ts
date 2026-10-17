import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { createdAt, id, timestamp, updatedAt } from './_helpers'
import { user } from './auth'
import { REFERRAL_TRIGGERS, REWARD_ROLES, REWARD_STATUSES } from './enums'

export const referralProgram = sqliteTable(
  'referral_program',
  {
    id: id(),
    name: text('name').notNull(),
    description: text('description'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    trigger: text('trigger', { enum: REFERRAL_TRIGGERS }).notNull(),
    /** Gig count for `gigs_approved`, paise for `earned_at_least`. */
    triggerValue: integer('trigger_value').notNull().default(1),
    /** Number of qualifying referees needed for one referrer reward. */
    threshold: integer('threshold').notNull().default(1),
    referrerReward: integer('referrer_reward').notNull().default(0),
    refereeReward: integer('referee_reward').notNull().default(0),
    repeatMode: text('repeat_mode', { enum: ['once', 'every'] }).notNull().default('once'),
    maxRewardsPerReferrer: integer('max_rewards_per_referrer'),
    qualifyWithinDays: integer('qualify_within_days'),
    autoApprove: integer('auto_approve', { mode: 'boolean' }).notNull().default(false),
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('referral_program_active_idx').on(t.active)],
)

export const referral = sqliteTable(
  'referral',
  {
    id: id(),
    referrerId: text('referrer_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    refereeId: text('referee_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    attributedAt: timestamp('attributed_at').notNull(),
    flagged: integer('flagged', { mode: 'boolean' }).notNull().default(false),
    flagReason: text('flag_reason'),
    approvedAt: timestamp('approved_at'),
    firstGigApprovedAt: timestamp('first_gig_approved_at'),
    gigsApproved: integer('gigs_approved').notNull().default(0),
    earned: integer('earned').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('referral_referrer_idx').on(t.referrerId), index('referral_flagged_idx').on(t.flagged)],
)

export const referralReward = sqliteTable(
  'referral_reward',
  {
    id: id(),
    programId: text('program_id')
      .notNull()
      .references(() => referralProgram.id, { onDelete: 'cascade' }),
    workerId: text('worker_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    referralId: text('referral_id').references(() => referral.id, { onDelete: 'set null' }),
    role: text('role', { enum: REWARD_ROLES }).notNull(),
    /** Referrer: 1-based reward tier. Referee: always 1. */
    tier: integer('tier').notNull().default(1),
    amount: integer('amount').notNull(),
    status: text('status', { enum: REWARD_STATUSES }).notNull().default('pending_review'),
    note: text('note'),
    payoutId: text('payout_id'),
    decidedBy: text('decided_by').references(() => user.id, { onDelete: 'set null' }),
    decidedAt: timestamp('decided_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('referral_reward_uq').on(t.programId, t.workerId, t.role, t.tier),
    index('referral_reward_status_idx').on(t.status),
    index('referral_reward_worker_idx').on(t.workerId),
    index('referral_reward_payout_idx').on(t.payoutId),
  ],
)
