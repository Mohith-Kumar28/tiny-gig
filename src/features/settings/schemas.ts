import { z } from 'zod'

const paise = z.coerce.number<string | number>().int().min(0).max(10_000_000)
const levelTable = z.object({ L1: paise, L2: paise, L3: paise, L4: paise })

export const settingsSchema = z.object({
  alertEmails: z.array(z.email()).max(20),
  submissionAlerts: z.enum(['immediate', 'digest', 'off']),
  applicantAlerts: z.boolean(),
  dailyDigest: z.boolean(),
  reminderHoursBefore: z.coerce.number<string | number>().int().min(0).max(72),
  defaultClaimWindowHours: z.coerce.number<string | number>().int().min(1).max(720),
  defaultLiveHoldHours: z.coerce.number<string | number>().int().min(0).max(720),
  /** Karma older than this is shown greyed out as stale (R5). */
  karmaStaleDays: z.coerce.number<string | number>().int().min(1).max(365),
  /** Minimum gap between any two pieces of client work on one account (R13). */
  anyClientGapDays: z.coerce.number<string | number>().int().min(0).max(60),
  /** No second post or comment in the same community within N days — per person, across all accounts (R14). */
  sameCommunityDays: z.coerce.number<string | number>().int().min(0).max(90),
  /** An account carries the same client's content at most N times in a rolling week (R15). */
  sameClientMaxPerWeek: z.coerce.number<string | number>().int().min(1).max(14),
  /** …with at least this many days between two pieces for the same client. */
  sameClientMinGapDays: z.coerce.number<string | number>().int().min(0).max(30),
  /** Pieces of client work per person per Indian calendar day. */
  perDayLimit: z.coerce.number<string | number>().int().min(1).max(10),
  /** Unfinished assignments a person can hold at once. */
  maxOpenAssignments: z.coerce.number<string | number>().int().min(1).max(20),
  /** Pause after a rejection before the person is eligible again. */
  afterRejectionDays: z.coerce.number<string | number>().int().min(0).max(30),
  /** How long workers have to say they're interested before selection starts (R12). */
  interestWindowMinutes: z.coerce.number<string | number>().int().min(1).max(24 * 60),
  /** Pay by account level (§6.1), in paise. Reddit posts and comments on level-priced gigs. */
  levelRates: z.object({ post: levelTable, comment: levelTable }),
  /** Upvotes pay the same at every level — nobody can tell which account cast which vote. */
  upvoteRate: paise,
  /** Lock every unpaid balance into a payout each Monday morning (IST). */
  weeklyPayouts: z.boolean(),
})
export type AppSettings = z.output<typeof settingsSchema>
export type AppSettingsInput = z.input<typeof settingsSchema>

export const DEFAULT_SETTINGS: AppSettings = {
  alertEmails: [],
  submissionAlerts: 'digest',
  applicantAlerts: true,
  dailyDigest: true,
  reminderHoursBefore: 2,
  defaultClaimWindowHours: 24,
  defaultLiveHoldHours: 24,
  karmaStaleDays: 30,
  anyClientGapDays: 5,
  sameCommunityDays: 7,
  sameClientMaxPerWeek: 2,
  sameClientMinGapDays: 3,
  perDayLimit: 1,
  maxOpenAssignments: 2,
  afterRejectionDays: 3,
  interestWindowMinutes: 10,
  // Placeholder rates until the owner fills the table in (§6.1).
  levelRates: {
    post: { L1: 6000, L2: 7000, L3: 8500, L4: 10000 },
    comment: { L1: 2000, L2: 2500, L3: 3000, L4: 4000 },
  },
  upvoteRate: 500,
  weeklyPayouts: true,
}

export const reviewTemplateSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1).max(60),
  body: z.string().trim().min(1).max(1000),
  kind: z.enum(['changes', 'reject', 'approve', 'applicant_reject']),
})
