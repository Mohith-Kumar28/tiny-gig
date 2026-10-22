import { z } from 'zod'

export const proofSchema = z.object({
  submissionId: z.string(),
  proofUrl: z.url('Paste the full link to your post or comment').trim().max(1000),
  screenshotKeys: z.array(z.string().max(200)).max(5),
  workerNote: z.string().trim().max(1000).optional().or(z.literal('')),
})
export type ProofInput = z.input<typeof proofSchema>

export const insightsSchema = z.object({
  submissionId: z.string(),
  insightsKeys: z.array(z.string().max(200)).min(1, 'Add a screenshot of the post’s insights').max(5),
  /** Optional karma refresh while the worker has their profile open. */
  karma: z.number().int().min(0).max(100_000_000).optional(),
  repliedToComments: z.literal(true, { error: 'Reply to comments on your post first: it’s part of the task' }),
  workerNote: z.string().trim().max(1000).optional().or(z.literal('')),
})
export type InsightsInput = z.input<typeof insightsSchema>

export const MAX_SCREENSHOTS = 5
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const ALLOWED_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
