import { CalendarRange, Gift, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { formatDateTime } from '@/components/shared/relative-time'
import { Input } from '@/components/ui/input'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { describeProgram, type ProgramRule, referrerTiersEarned } from '../rules'
import { ProgramStateBadge, programState } from './program-state-badge'

const MAX_DOTS = 40

/** Live plain-English summary + worked example of a program rule (values in paise). */
export function ProgramPreview({ rule, autoApprove, name }: { rule: ProgramRule; autoApprove: boolean; name?: string }) {
  const [example, setExample] = useState(7)
  const count = Math.max(0, Math.min(1000, example))
  const tiers = referrerTiersEarned(rule, count)
  const referrerTotal = tiers * rule.referrerReward
  const refereeTotal = count * rule.refereeReward
  const t = Math.max(1, rule.threshold)
  const rewardedUpTo = rule.referrerReward > 0 ? tiers * t : 0

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> Live preview
          </span>
          <ProgramStateBadge state={programState(rule)} />
        </div>
        {name ? <p className="font-display text-lg font-semibold tracking-tight">{name}</p> : null}
        <p className="text-sm leading-relaxed text-pretty">{describeProgram(rule)}</p>
      </div>

      <div className="space-y-3 rounded-lg border bg-background p-3">
        <div className="flex items-center gap-2 text-sm">
          <span>A worker who refers</span>
          <Input
            type="number"
            min={0}
            max={1000}
            value={example}
            onChange={(e) => setExample(Number(e.target.value) || 0)}
            className="h-7 w-16 px-2 tabular"
            aria-label="Example number of qualifying referrals"
          />
          <span>qualifying people</span>
        </div>

        {count > 0 ? (
          <div className="flex flex-wrap gap-1" aria-hidden>
            {Array.from({ length: Math.min(count, MAX_DOTS) }, (_, i) => {
              const counted = i < rewardedUpTo
              const tierEnd = counted && (i + 1) % t === 0
              return (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: static dots
                  key={i}
                  className={cn(
                    'flex size-4 items-center justify-center rounded-full',
                    tierEnd ? 'bg-primary text-primary-foreground' : counted ? 'bg-primary/25' : 'bg-muted-foreground/20',
                  )}
                >
                  {tierEnd ? <Gift className="size-2.5" /> : null}
                </span>
              )
            })}
            {count > MAX_DOTS ? <span className="text-xs text-muted-foreground tabular">+{count - MAX_DOTS}</span> : null}
          </div>
        ) : null}

        <dl className="grid gap-1.5 text-sm">
          {rule.referrerReward > 0 ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">
                Referrer earns {tiers} reward{tiers === 1 ? '' : 's'}
                {tiers > 0 ? ` × ${formatMoney(rule.referrerReward)}` : ''}
              </dt>
              <dd className="font-medium tabular">{formatMoney(referrerTotal)}</dd>
            </div>
          ) : null}
          {rule.refereeReward > 0 ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">
                {count} referred worker{count === 1 ? '' : 's'} × {formatMoney(rule.refereeReward)}
              </dt>
              <dd className="font-medium tabular">{formatMoney(refereeTotal)}</dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-3 border-t pt-1.5">
            <dt className="font-medium">Total payout</dt>
            <dd className="font-display text-base font-semibold tabular">{formatMoney(referrerTotal + refereeTotal)}</dd>
          </div>
        </dl>
        {rule.referrerReward > 0 && rule.repeatMode === 'once' && count >= t * 2 ? (
          <p className="text-xs text-muted-foreground">Set Repeat to "every" to keep rewarding referrers after their first {t}.</p>
        ) : null}
        {rule.maxRewardsPerReferrer != null && tiers >= rule.maxRewardsPerReferrer && count >= t * (rule.maxRewardsPerReferrer + 1) ? (
          <p className="text-xs text-muted-foreground">Capped at {rule.maxRewardsPerReferrer} referrer rewards.</p>
        ) : null}
      </div>

      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          {autoApprove ? 'Rewards go straight to the worker balance.' : 'Rewards wait in the review queue until you approve them.'}
        </li>
        <li className="flex items-start gap-2">
          <CalendarRange className="mt-0.5 size-4 shrink-0" />
          {rule.startsAt || rule.endsAt
            ? `Counts workers who join ${rule.startsAt ? `from ${formatDateTime(rule.startsAt)}` : ''}${rule.startsAt && rule.endsAt ? ' ' : ''}${rule.endsAt ? `until ${formatDateTime(rule.endsAt)}` : ''}.`
            : 'No date window. Counts every referral, past and future.'}
        </li>
        <li className="flex items-start gap-2">
          <Gift className="mt-0.5 size-4 shrink-0" />
          Flagged referrals (shared phone, UPI or Reddit) never count.
        </li>
      </ul>
    </div>
  )
}
