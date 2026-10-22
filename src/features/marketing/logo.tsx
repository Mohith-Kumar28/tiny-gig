import { LogoMark, Wordmark } from '@/components/shared/logo'
import { cn } from '@/lib/utils'

export function Logo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark inverse={inverse} className="size-8" />
      <Wordmark className="text-xl" />
    </span>
  )
}
