import { z } from 'zod'
import { INDIAN_STATES } from '@/db/schema/enums'

export const REDDIT_URL_RE = /^https?:\/\/(www\.|old\.|new\.)?reddit\.com\/(u|user)\/([A-Za-z0-9_-]{3,20})\/?/i

export function parseRedditUsername(url: string) {
  return url.match(REDDIT_URL_RE)?.[3] ?? null
}

export const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/

export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits
  return `+91${local}`
}

export const applicationSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(80),
  email: z.email('Enter a valid email').trim().toLowerCase(),
  phone: z
    .string()
    .trim()
    .refine((v) => /^(\+?91)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')), 'Enter a valid 10-digit Indian mobile number'),
  state: z.enum(INDIAN_STATES, { error: 'Select your state' }),
  redditUrl: z
    .string()
    .trim()
    .regex(REDDIT_URL_RE, 'Paste your profile link, e.g. https://www.reddit.com/user/yourname'),
  /** yyyy-mm-dd, the account's cake day. Age (and so pay level) is computed from it, never stored. */
  redditCreatedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick the date your account was created')
    .refine((v) => Date.parse(`${v}T00:00:00+05:30`) <= Date.now(), 'The date can’t be in the future'),
  karma: z.coerce.number<string | number>().int().min(0, 'Must be 0 or more').max(10_000_000),
  upiId: z.string().trim().regex(UPI_RE, 'Enter a valid UPI ID, e.g. name@okaxis'),
  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .max(12)
    .optional()
    .or(z.literal('')),
  /** The separate account-loss checkbox (R59) — not folded into a general terms link. */
  acceptAccountLoss: z.literal(true, { error: 'Please read and tick this to continue' }),
})
export type ApplicationInput = z.input<typeof applicationSchema>

/** Accounts (Reddit and other socials) are managed on the "My accounts" page, not here. */
export const profileUpdateSchema = applicationSchema
  .omit({ referralCode: true, email: true, redditUrl: true, redditCreatedOn: true, karma: true, acceptAccountLoss: true })
  .extend({
  bio: z.string().trim().max(500).optional().or(z.literal('')),
  languages: z.string().trim().max(120).optional().or(z.literal('')),
  emailPrefs: z.object({ newGigs: z.boolean(), reminders: z.boolean() }),
})
export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>

export const ACCOUNT_AGE_HINT = 'Find it on your Reddit profile under “Cake day”.'
