import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { Countdown } from '@/components/shared/countdown'
import { Money } from '@/components/shared/money'
import { PlatformIcon, PLATFORM_LABELS } from '@/components/shared/platform-icon'
import { formatDate, RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Platform, SubmissionStatus } from '@/db/schema/enums'
import { cn } from '@/lib/utils'

export type WorkerTask = {
  id: string
  status: SubmissionStatus
  payoutAmount: number
  dueAt: Date | string
  submittedAt?: Date | string | null
  liveCheckAt?: Date | string | null
  decidedAt?: Date | string | null
  payoutId?: string | null
  title: string
  platform: Platform
  community?: string | null
}

/** The one date that matters for each status. */
export function TaskWhen({ task }: { task: WorkerTask }) {
  switch (task.status) {
    case 'claimed':
    case 'changes_requested':
      return <Countdown to={task.dueAt} prefix="Due" />
    case 'live_check':
      if (!task.liveCheckAt) return null
      return new Date(task.liveCheckAt).getTime() > Date.now() ? (
        <Countdown to={task.liveCheckAt} prefix="Final check" className="text-info" />
      ) : (
        <span className="text-xs text-info">Final check soon</span>
      )
    case 'submitted':
    case 'resubmitted':
      return (
        <span className="text-xs text-muted-foreground">
          Sent <RelativeTime date={task.submittedAt} />
        </span>
      )
    case 'approved':
      return (
        <span className="text-xs text-muted-foreground">
          {task.payoutId ? 'Paid out' : 'In balance'} · {task.decidedAt ? formatDate(task.decidedAt) : ''}
        </span>
      )
    default:
      return <span className="text-xs text-muted-foreground">{task.decidedAt ? formatDate(task.decidedAt) : ''}</span>
  }
}

export function WorkerTaskRow({ task }: { task: WorkerTask }) {
  const urgent = task.status === 'changes_requested'
  return (
    <Link
      to="/w/work/$submissionId"
      params={{ submissionId: task.id }}
      className={cn(
        'flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none',
        urgent && 'bg-warning/6',
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <PlatformIcon platform={task.platform} className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <StatusBadge status={task.status} />
          <TaskWhen task={task} />
          {task.community ? (
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">{task.community || PLATFORM_LABELS[task.platform]}</span>
          ) : null}
        </div>
      </div>
      <Money paise={task.payoutAmount} className={cn('shrink-0 text-sm', task.status === 'approved' && 'text-success')} />
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

export function WorkerTaskRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Skeleton className="size-9 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-4 w-12" />
    </div>
  )
}
