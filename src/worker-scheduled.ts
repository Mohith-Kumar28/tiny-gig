import { runCronJobs } from '@/features/jobs/server/cron'

export async function runScheduled(scheduledTime: number) {
  await runCronJobs(new Date(scheduledTime))
}
