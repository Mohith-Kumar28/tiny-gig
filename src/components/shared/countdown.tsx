import { differenceInMinutes } from 'date-fns'
import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/** Deadline chip that turns amber under 6h and red under 1h. */
export function Countdown({ to, className, prefix = 'Due' }: { to: Date | string; className?: string; prefix?: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])
  const target = new Date(to)
  const mins = differenceInMinutes(target, now)
  const overdue = mins <= 0
  const h = Math.floor(Math.abs(mins) / 60)
  const m = Math.abs(mins) % 60
  const d = Math.floor(h / 24)
  const text = overdue ? 'Overdue' : d >= 1 ? `${d}d ${h % 24}h` : h >= 1 ? `${h}h ${m}m` : `${m}m`
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium tabular text-muted-foreground',
        className,
        // Urgency wins over any caller colour so a near deadline always reads as one.
        overdue || mins < 60 ? 'text-destructive' : mins < 360 ? 'text-warning-foreground dark:text-warning' : null,
      )}
    >
      <Clock className="size-3.5" />
      {overdue ? text : `${prefix} in ${text}`}
    </span>
  )
}
