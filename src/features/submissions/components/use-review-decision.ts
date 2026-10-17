import { toast } from 'sonner'
import { useAction } from '@/hooks/use-action'
import { decideSubmissions } from '../server/admin-review'
import type { ReviewDecision } from '../state'

export type DecisionVars = {
  ids: string[]
  decision: ReviewDecision
  comment?: string
  checklist?: string[]
  skipLiveCheck?: boolean
}

const VERB: Record<ReviewDecision, string> = {
  approve: 'Approved',
  request_changes: 'Changes requested',
  reject: 'Rejected',
}

/**
 * Review decision mutation (single or bulk) with outcome toasts.
 */
export function useReviewDecision(opts: { onDone?: (vars: DecisionVars) => void } = {}) {
  return useAction((v: DecisionVars) => decideSubmissions({ data: v }), {
    success: (r, v) => {
      if (r.failed.length) {
        toast.error(`${r.failed.length} couldn't be updated: ${r.failed[0]?.error ?? ''}`)
      }
      if (!r.ok) return null
      const liveCheck = r.results.some((x) => x.status === 'live_check')
      if (v.ids.length === 1) return liveCheck ? 'Passed review → live check started' : VERB[v.decision]
      return `${VERB[v.decision]}: ${r.ok} submission${r.ok === 1 ? '' : 's'}`
    },
    invalidate: [['admin']],
    onSuccess: (_r, v) => opts.onDone?.(v),
  })
}
