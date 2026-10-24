export const REFERRAL_COOKIE = 'tg_ref'
export const REFERRAL_COOKIE_DAYS = 30

/** A code is the worker's name (up to 16 letters) plus, when that name is taken, a suffix of up to 4 more. */
export const REFERRAL_NAME_MAX = 16
export const REFERRAL_SUFFIX_MAX = 4
/** Every limit on a code (link, cookie, form) uses this, so it can never be shorter than a generated code. */
export const REFERRAL_CODE_MAX = REFERRAL_NAME_MAX + REFERRAL_SUFFIX_MAX

/** The one way a code is cleaned up, wherever it comes from: link, cookie or typed in. */
export function normalizeReferralCode(raw: string | null | undefined) {
  return (raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, REFERRAL_CODE_MAX)
}
