import { z } from 'zod'
import { GIG_STATUSES, INDIAN_STATES, PLATFORMS, TASK_TYPES } from '@/db/schema/enums'

const int = (min: number, max: number) => z.coerce.number<string | number>().int().min(min).max(max)

export const gigFormSchema = z.object({
  title: z.string().trim().min(4, 'Give the gig a clear title').max(120),
  platform: z.enum(PLATFORMS),
  taskType: z.enum(TASK_TYPES),
  brief: z.string().trim().min(10, 'Describe the task').max(5000),
  targetUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => !v || /^https?:\/\//i.test(v), 'Must be a full URL')
    .optional()
    .or(z.literal('')),
  community: z.string().trim().max(120).optional().or(z.literal('')),
  contentGuidelines: z.string().trim().max(5000).optional().or(z.literal('')),
  sampleContent: z.string().trim().max(5000).optional().or(z.literal('')),
  reviewChecklist: z.array(z.string().trim().min(1).max(200)).max(20),
  payoutRupees: z.coerce.number<string | number>().min(1, 'Minimum ₹1').max(100_000),
  totalSlots: int(1, 10_000),
  claimWindowHours: int(1, 24 * 30),
  liveHoldHours: int(0, 24 * 30),
  minKarma: int(0, 10_000_000),
  minAccountAgeMonths: int(0, 300),
  allowedStates: z.array(z.enum(INDIAN_STATES)),
  startsAt: z.string().optional().or(z.literal('')),
  endsAt: z.string().optional().or(z.literal('')),
  priority: int(0, 10),
  status: z.enum(GIG_STATUSES),
  notifyWorkers: z.boolean(),
})
export type GigFormInput = z.input<typeof gigFormSchema>
export type GigFormValues = z.output<typeof gigFormSchema>

export const GIG_FORM_DEFAULTS: GigFormInput = {
  title: '',
  platform: 'reddit',
  taskType: 'post',
  brief: '',
  targetUrl: '',
  community: '',
  contentGuidelines: '',
  sampleContent: '',
  reviewChecklist: ['Posted in the right community', 'Follows the brief', 'Link opens and post is public'],
  payoutRupees: 50,
  totalSlots: 10,
  claimWindowHours: 24,
  liveHoldHours: 24,
  minKarma: 0,
  minAccountAgeMonths: 0,
  allowedStates: [],
  startsAt: '',
  endsAt: '',
  priority: 0,
  status: 'draft',
  notifyWorkers: true,
}
