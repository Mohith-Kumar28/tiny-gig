import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { createdAt, id, timestamp, updatedAt } from './_helpers'
import { user } from './auth'
import { ACCOUNT_PLATFORMS, ACCOUNT_STANDINGS } from './enums'

const userRef = (name: string) => text(name).references(() => user.id, { onDelete: 'set null' })

/**
 * One row per social account — the register. A worker with four Reddit accounts is four rows.
 * Age (and so level) is always computed from `createdOn`; karma is manual and carries its own date.
 */
export const socialAccount = sqliteTable(
  'social_account',
  {
    id: id(),
    workerId: text('worker_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    platform: text('platform', { enum: ACCOUNT_PLATFORMS }).notNull(),
    /** Lowercased handle without prefix (no "u/" or "@"). */
    handle: text('handle').notNull(),
    url: text('url').notNull(),
    createdOn: timestamp('created_on'),
    createdOnConfirmedAt: timestamp('created_on_confirmed_at'),
    createdOnConfirmedBy: userRef('created_on_confirmed_by'),
    karma: integer('karma'),
    karmaUpdatedAt: timestamp('karma_updated_at'),
    standing: text('standing', { enum: ACCOUNT_STANDINGS }).notNull().default('active'),
    standingNote: text('standing_note'),
    addedBy: userRef('added_by'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('social_account_handle_uq').on(t.platform, t.handle),
    index('social_account_worker_idx').on(t.workerId),
    index('social_account_standing_idx').on(t.standing),
  ],
)

/** Internal client tags. Admin-only: never returned by worker-facing server functions. */
export const clientTag = sqliteTable('client_tag', {
  id: id(),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('slate'),
  archivedAt: timestamp('archived_at'),
  createdAt: createdAt(),
})

/**
 * Recorded acceptances of legal wording (R59, R62). One row per acceptance —
 * when the wording's version changes, workers are asked again and a new row is written.
 */
export const consent = sqliteTable(
  'consent',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['account_loss'] }).notNull(),
    version: text('version').notNull(),
    acceptedAt: timestamp('accepted_at').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (t) => [index('consent_user_idx').on(t.userId, t.kind, t.acceptedAt)],
)
