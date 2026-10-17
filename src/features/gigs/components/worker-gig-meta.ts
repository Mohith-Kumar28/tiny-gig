import type { TaskType } from '@/db/schema/enums'

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  post: 'Post',
  comment: 'Comment',
  reply: 'Reply',
  upvote: 'Upvote',
  other: 'Other',
}

/** "24 hours" → "1 day", "36 hours" stays "36 hours". */
export function formatHours(h: number) {
  if (h >= 24 && h % 24 === 0) {
    const d = h / 24
    return `${d} day${d === 1 ? '' : 's'}`
  }
  return `${h} hour${h === 1 ? '' : 's'}`
}

export function slotsLeft(g: { totalSlots: number; claimedSlots: number }) {
  return Math.max(0, g.totalSlots - g.claimedSlots)
}
