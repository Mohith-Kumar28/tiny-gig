import { Link } from '@tanstack/react-router'
import { Copy, Pencil } from 'lucide-react'
import { Money } from '@/components/shared/money'
import { formatDate } from '@/components/shared/relative-time'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { describeProgram, TRIGGER_LABELS } from '../rules'
import type { ProgramRow } from './program-form-values'
import { ProgramStateBadge, programState } from './program-state-badge'

export function ProgramCard({
  program: p,
  onEdit,
  onDuplicate,
  onToggle,
  toggling,
}: {
  program: ProgramRow
  onEdit: () => void
  onDuplicate: () => void
  onToggle: (active: boolean) => void
  toggling?: boolean
}) {
  const state = programState(p)
  return (
    <article className={cn('flex flex-col rounded-xl border bg-card p-5 transition-colors', state !== 'running' && 'bg-card/60')}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-base font-semibold tracking-tight">{p.name}</h3>
            <ProgramStateBadge state={state} />
          </div>
          {p.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p> : null}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Switch checked={p.active} disabled={toggling} onCheckedChange={onToggle} aria-label={p.active ? 'Pause program' : 'Activate program'} />
            </span>
          </TooltipTrigger>
          <TooltipContent>{p.active ? 'Pause program' : 'Activate program'}</TooltipContent>
        </Tooltip>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-pretty">{describeProgram(p)}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{TRIGGER_LABELS[p.trigger]}</Badge>
        <Badge variant="outline">{p.autoApprove ? 'Auto-approve' : 'Manual review'}</Badge>
        {p.startsAt || p.endsAt ? (
          <Badge variant="outline" className="tabular">
            {p.startsAt ? formatDate(p.startsAt) : 'Any time'} → {p.endsAt ? formatDate(p.endsAt) : 'no end'}
          </Badge>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Rewards issued</dt>
          <dd className="font-display text-lg font-semibold tabular">{formatNumber(p.rewardsCount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Amount</dt>
          <dd className="font-display text-lg">
            <Money paise={p.rewardsAmount} className="font-semibold" />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Pending review</dt>
          <dd className="font-display text-lg font-semibold tabular">
            {p.pendingCount ? (
              <Link
                to="/admin/referrals"
                search={{ programId: p.id }}
                className="text-primary underline-offset-4 hover:underline"
              >
                {formatNumber(p.pendingCount)}
              </Link>
            ) : (
              <span className="text-muted-foreground">0</span>
            )}
          </dd>
        </div>
      </dl>

      <footer className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil /> Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={onDuplicate}>
          <Copy /> Duplicate
        </Button>
      </footer>
    </article>
  )
}
