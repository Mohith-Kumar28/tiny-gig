import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

/** Same mark as the marketing site and favicon. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-7 shrink-0', className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M12.2 7.5h4.6v4h5v4.2h-5v5.1c0 1 .6 1.6 1.7 1.6h3.3V26h-4.4c-3.4 0-5.2-1.8-5.2-5.1v-5.2H9.4v-4.2h2.8z"
        className="fill-primary-foreground"
      />
      <circle cx="24.2" cy="8.4" r="2.3" className="fill-primary-foreground" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn('font-display text-lg font-semibold tracking-tight', className)}>TinyGig</span>
}

export function Logo({ className, to = '/' }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <Wordmark />
    </Link>
  )
}
