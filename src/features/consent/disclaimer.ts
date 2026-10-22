/**
 * The account-loss disclaimer (§12). Same sentence in every place it appears: sign-up,
 * the top of "My accounts", and each assignment confirmation.
 * Bump `version` whenever the wording changes — every worker is asked to accept again (R62).
 */
export const ACCOUNT_LOSS = {
  version: '2026-10-22',
  text: 'You run and maintain your own social media accounts. TinyGig is not responsible if any of your accounts is suspended, shadowbanned, restricted or lost — including while doing gigs.',
  short: 'Your accounts are your responsibility. TinyGig is not liable if an account is suspended, shadowbanned or lost.',
} as const
