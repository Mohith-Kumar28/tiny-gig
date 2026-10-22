import { Money } from '@/components/shared/money'
import { formatDate } from '@/components/shared/relative-time'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

export type Pay = {
  min: number
  max: number
  byLevel: boolean
  mine: { rate: number; label: string; next: { level: string; rate: number; at: Date } | null } | null
}

/** The worker's own rate when we know it, otherwise the range — a single number is a lie for most readers (R28). */
export function PayAmount({ pay, className }: { pay: Pay; className?: string }) {
  if (pay.mine) return <Money paise={pay.mine.rate} className={className} />
  if (pay.min === pay.max) return <Money paise={pay.min} className={className} />
  return (
    <span className={cn('tabular whitespace-nowrap', className)}>
      {formatMoney(pay.min)}-{formatMoney(pay.max)}
    </span>
  )
}

export function payCaption(pay: Pay) {
  if (pay.mine) return `with ${pay.mine.label}`
  if (pay.byLevel && pay.min !== pay.max) return 'depending on your account'
  return 'per task'
}

/** "₹100 once this account is 6 months old" (R29): a reason to keep accounts healthy. */
export function NextLevelLine({ pay, className }: { pay: Pay; className?: string }) {
  const next = pay.mine?.next
  if (!next) return null
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      {formatMoney(next.rate)} once {pay.mine?.label} reaches {next.level} on {formatDate(next.at)}
    </p>
  )
}
