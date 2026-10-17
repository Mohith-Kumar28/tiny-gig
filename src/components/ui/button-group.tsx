import type * as React from 'react'
import { cn } from '@/lib/utils'

/** Joins adjacent buttons into one control (shadcn button-group). */
function ButtonGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      className={cn(
        'flex w-fit items-stretch [&>*]:focus-visible:relative [&>*]:focus-visible:z-10',
        '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none',
        '[&>[data-slot=button]:not(:first-child)]:border-l [&>[data-slot=button]:not(:first-child)]:border-l-primary-foreground/20',
        className,
      )}
      {...props}
    />
  )
}

export { ButtonGroup }
