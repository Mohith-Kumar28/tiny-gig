import { LogoMark, Wordmark } from '@/components/shared/logo'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="size-8" />
      <Wordmark className="text-xl font-bold" />
    </span>
  )
}
