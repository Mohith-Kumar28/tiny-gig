import { z } from 'zod'

export const settingsSchema = z.object({
  alertEmails: z.array(z.email()).max(20),
  submissionAlerts: z.enum(['immediate', 'digest', 'off']),
  applicantAlerts: z.boolean(),
  dailyDigest: z.boolean(),
  reminderHoursBefore: z.coerce.number<string | number>().int().min(0).max(72),
  defaultClaimWindowHours: z.coerce.number<string | number>().int().min(1).max(720),
  defaultLiveHoldHours: z.coerce.number<string | number>().int().min(0).max(720),
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
}

export const reviewTemplateSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1).max(60),
  body: z.string().trim().min(1).max(1000),
  kind: z.enum(['changes', 'reject', 'approve', 'applicant_reject']),
})
