import { customAlphabet } from 'nanoid'

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
const nano = customAlphabet(alphabet, 16)

/** Sortable-enough, URL-safe id. */
export function createId() {
  return nano()
}

const codeAlphabet = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 7)

/** Human-friendly referral code (no 0/O/1/I confusion). */
export function createReferralCode() {
  return codeAlphabet()
}
