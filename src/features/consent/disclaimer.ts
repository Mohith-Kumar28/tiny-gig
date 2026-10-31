/**
 * The account-loss clause workers accept by ticking "I agree to the Terms" at sign-up (Terms §10.2).
 * It is not shown anywhere else in the app. Keep `text` in sync with §10.2 and bump `version` when it changes.
 */
export const ACCOUNT_LOSS = {
  version: '2026-10-22',
  text: 'You run and maintain your own social media accounts. TinyGig is not responsible if any of your accounts is suspended, shadowbanned, restricted or lost — including while doing gigs.',
} as const
