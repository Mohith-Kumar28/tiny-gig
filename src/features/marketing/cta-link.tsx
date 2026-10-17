import { ArrowRight } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type CtaLinkProps = ComponentProps<'a'> & { variant?: 'primary' | 'ghost' | 'inverse'; size?: 'md' | 'lg'; arrow?: boolean }

/** Pill-shaped link button. Interactive elements on marketing pages are full-pill; surfaces use rounded-3xl. */
export function CtaLink({ variant = 'primary', size = 'md', arrow = false, className, children, ...props }: CtaLinkProps) {
  return (
    <a
      className={cn(
        'group inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap outline-none transition-[transform,background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]',
        size === 'md' ? 'h-10 px-5 text-sm' : 'h-13 px-7 text-base',
        variant === 'primary' &&
          'bg-primary text-primary-foreground shadow-[0_1px_0_0_oklch(1_0_0/0.25)_inset,0_8px_24px_-10px_var(--color-primary)] hover:bg-primary/90',
        variant === 'ghost' && 'text-foreground ring-1 ring-border ring-inset hover:bg-accent',
        variant === 'inverse' && 'bg-foreground text-background hover:bg-foreground/85',
        className,
      )}
      {...props}
    >
      {children}
      {arrow && (
        <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      )}
    </a>
  )
}
