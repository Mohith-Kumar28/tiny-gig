import { ArrowRight } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type CtaLinkProps = ComponentProps<'a'> & { variant?: 'primary' | 'ghost' | 'paper'; size?: 'md' | 'lg'; arrow?: boolean }

/** Link button for marketing pages. Same 4px corner as every control in the app. */
export function CtaLink({ variant = 'primary', size = 'md', arrow = false, className, children, ...props }: CtaLinkProps) {
  return (
    <a
      className={cn(
        'group inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap outline-none transition-[transform,background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px',
        size === 'md' ? 'h-10 px-4 text-sm' : 'h-12 px-6 text-base',
        variant === 'primary' &&
          'bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.18)] hover:bg-primary/92',
        variant === 'ghost' && 'bg-card text-foreground ring-1 ring-input ring-inset hover:bg-accent',
        variant === 'paper' && 'bg-cloth-foreground text-cloth hover:bg-white focus-visible:ring-offset-cloth',
        className,
      )}
      {...props}
    >
      {children}
      {arrow && <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
    </a>
  )
}
