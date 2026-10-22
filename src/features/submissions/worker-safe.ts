/**
 * Fields that never leave admin (R41, R44, R45): who the work was for, who selected it,
 * override reasons and on-behalf markers. Every worker-facing payload goes through these.
 */
export const INTERNAL_SUBMISSION_FIELDS = ['clientTagId', 'selectedBy', 'overrideReason', 'onBehalfBy', 'decidedBy'] as const
export const INTERNAL_GIG_FIELDS = ['clientTagId', 'createdBy'] as const

function omit<T extends object, K extends string>(row: T, keys: readonly K[]): Omit<T, K & keyof T> {
  const out = { ...row } as Record<string, unknown>
  for (const k of keys) delete out[k]
  return out as Omit<T, K & keyof T>
}

export function workerSafeSubmission<T extends object>(row: T) {
  return omit(row, INTERNAL_SUBMISSION_FIELDS)
}

export function workerSafeGig<T extends object>(row: T) {
  return omit(row, INTERNAL_GIG_FIELDS)
}
