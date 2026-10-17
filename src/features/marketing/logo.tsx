import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

/** TinyGig mark: a tangerine tile with a lowercase "t" and a small spark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M12.2 7.5h4.6v4h5v4.2h-5v5.1c0 1 .6 1.6 1.7 1.6h3.3V26h-4.4c-3.4 0-5.2-1.8-5.2-5.1v-5.2H9.4v-4.2h2.8z"
        className="fill-primary-foreground"
      />
      <circle cx="24.2" cy="8.4" r="2.3" className="fill-primary-foreground" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-tight">{SITE.name}</span>
    </span>
  )
}
