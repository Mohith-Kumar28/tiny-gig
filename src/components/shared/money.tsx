import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

export function Money({ paise, className, decimals }: { paise: number; className?: string; decimals?: boolean }) {
  return <span className={cn('tabular font-medium', className)}>{formatMoney(paise, { decimals })}</span>
}
