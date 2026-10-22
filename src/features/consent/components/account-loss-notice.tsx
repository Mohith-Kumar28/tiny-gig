import { ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ACCOUNT_LOSS } from '../disclaimer'

/** The permanent notice at the top of "My accounts" (R60) and in assignment confirmations (R61). */
export function AccountLossNotice({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'flex gap-2.5 rounded-lg border border-warning/40 bg-warning/[0.08] text-sm text-warning-foreground dark:text-warning',
        compact ? 'p-2.5 text-xs' : 'p-3.5',
        className,
      )}
    >
      <ShieldAlert className={cn('shrink-0', compact ? 'size-3.5' : 'mt-px size-4')} />
      <p>{compact ? ACCOUNT_LOSS.short : ACCOUNT_LOSS.text}</p>
    </div>
  )
}
