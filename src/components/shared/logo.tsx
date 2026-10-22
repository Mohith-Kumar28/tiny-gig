import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

/**
 * TinyGig mark: a lowercase "t" on a khata-red tile, settled with the ledger's double rule.
 * `inverse` draws a paper tile with a red letter for use on the red cloth shell.
 */
export function LogoMark({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-7 shrink-0', className)}>
      <rect width="32" height="32" rx="6" className={inverse ? 'fill-cloth-foreground' : 'fill-primary'} />
      <g className={inverse ? 'fill-cloth' : 'fill-primary-foreground'}>
        <path
          transform="translate(2.6 0.2) scale(0.84)"
          d="M12.2 7.5h4.6v4h5v4.2h-5v5.1c0 1 .6 1.6 1.7 1.6h3.3V26h-4.4c-3.4 0-5.2-1.8-5.2-5.1v-5.2H9.4v-4.2h2.8z"
        />
        <rect x="8" y="24.4" width="16" height="1.5" />
        <rect x="8" y="27.1" width="16" height="1.5" />
      </g>
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn('font-display text-[1.15rem] font-extrabold tracking-tight', className)}>TinyGig</span>
}

export function Logo({ className, to = '/', inverse = false }: { className?: string; to?: string; inverse?: boolean }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark inverse={inverse} />
      <Wordmark />
    </Link>
  )
}
