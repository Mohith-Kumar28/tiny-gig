import { downloadCsv } from '@/components/data-table/csv'
import type { WorkerRow } from './worker-columns'

export function exportWorkersCsv(rows: WorkerRow[]) {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCsv(`tinygig-workers-${stamp}`, rows, [
    { header: 'Name', value: (r) => r.fullName },
    { header: 'Email', value: (r) => r.email },
    { header: 'Phone', value: (r) => r.phone },
    { header: 'State', value: (r) => r.state },
    { header: 'Reddit', value: (r) => r.redditUrl || `u/${r.redditUsername}` },
    { header: 'Karma', value: (r) => r.karma },
    { header: 'UPI', value: (r) => r.upiId },
    { header: 'Status', value: (r) => r.status },
    { header: 'Completed', value: (r) => r.completedCount },
    { header: 'Earned (INR)', value: (r) => (r.earnedTotal / 100).toFixed(2) },
  ])
}
