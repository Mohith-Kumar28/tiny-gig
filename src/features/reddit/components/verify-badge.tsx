import { AlertTriangle, CheckCircle2, Clock, HelpCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { RelativeTime } from '@/components/shared/relative-time'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { PROBLEM_STATES, VERIFY_LABELS, type VerifyState } from '../verify'

type Detail = Record<string, string | number | boolean | null> | null

/** Compact verdict of the automatic live check, for tables and queue rows. Admin-only. */
export function VerifyIcon({ state, className }: { state: string | null; className?: string }) {
  if (!state) return null
  const s = state as VerifyState
  const problem = PROBLEM_STATES.includes(s)
  const Icon = s === 'live' ? CheckCircle2 : problem ? AlertTriangle : s === 'error' ? Clock : HelpCircle
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Icon
          aria-label={`Live check: ${VERIFY_LABELS[s] ?? s}`}
          className={cn('size-3.5 shrink-0', s === 'live' ? 'text-success' : problem ? 'text-destructive' : 'text-muted-foreground', className)}
        />
      </TooltipTrigger>
      <TooltipContent>Live check: {VERIFY_LABELS[s] ?? s}</TooltipContent>
    </Tooltip>
  )
}

export function verifySummary(state: string | null, detail: Detail) {
  const d = detail ?? {}
  switch (state as VerifyState | null) {
    case 'live':
      return `Live on Reddit${d.author ? ` · posted by u/${d.author}` : ''}${typeof d.score === 'number' ? ` · ${d.score} points` : ''}${typeof d.comments === 'number' ? ` · ${d.comments} comments` : ''}`
    case 'removed':
      return `Removed by ${d.removedBy ?? 'moderators'}`
    case 'deleted':
      return 'Deleted by the author'
    case 'missing':
      return 'Reddit can’t find this post or comment'
    case 'wrong_author':
      return String(d.note ?? 'Posted from a different account')
    case 'unresolved':
      return String(d.note ?? 'Couldn’t read this link. Check it by hand.')
    case 'error':
      return 'Reddit didn’t answer. Retrying automatically.'
    default:
      return null
  }
}

/** Full banner for the review panel. */
export function VerifyBanner({
  state,
  detail,
  checkedAt,
  liveAt,
  flaggedAt,
  action,
}: {
  state: string | null
  detail: Detail
  checkedAt: Date | null
  liveAt: Date | null
  flaggedAt: Date | null
  action?: ReactNode
}) {
  const s = state as VerifyState | null
  const problem = s ? PROBLEM_STATES.includes(s) : false
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3.5 text-sm',
        s === 'live' ? 'border-success/30 bg-success/8' : problem ? 'border-destructive/30 bg-destructive/6' : 'bg-muted/40',
      )}
    >
      {s ? <VerifyIcon state={s} className="mt-0.5 size-4" /> : <Clock className="mt-0.5 size-4 text-muted-foreground" />}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium">{s ? verifySummary(s, detail) : 'Not checked yet'}</p>
        <p className="text-xs text-muted-foreground">
          Automatic live check
          {checkedAt ? (
            <>
              {' '}
              · checked <RelativeTime date={checkedAt} />
            </>
          ) : null}
          {problem && flaggedAt ? (
            <>
              {' '}
              · first seen <RelativeTime date={flaggedAt} />
            </>
          ) : null}
          {problem && liveAt ? (
            <>
              {' '}
              · last seen live <RelativeTime date={liveAt} />
            </>
          ) : null}
          {problem ? ' · your call: approve anyway or reject' : ''}
        </p>
      </div>
      {action}
    </div>
  )
}
