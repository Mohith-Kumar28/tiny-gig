import { formatDistanceToNowStrict } from 'date-fns'
import { useEffect, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// Always render in IST so server (UTC) and browser output match.
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})
const dateFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })

export function formatDateTime(d: Date | string | number) {
  return dateTimeFmt.format(new Date(d))
}

export function formatDate(d: Date | string | number) {
  return dateFmt.format(new Date(d))
}

/** "3h ago" / "in 2h" with the exact time on hover. Re-renders every minute. */
export function RelativeTime({ date, className }: { date: Date | string | number | null | undefined; className?: string }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])
  if (!date) return <span className="text-muted-foreground">—</span>
  const d = new Date(date)
  const future = d.getTime() > Date.now()
  const rel = formatDistanceToNowStrict(d, { addSuffix: false })
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time suppressHydrationWarning dateTime={d.toISOString()} className={cn('tabular whitespace-nowrap', className)}>
          {future ? `in ${rel}` : `${rel} ago`}
        </time>
      </TooltipTrigger>
      <TooltipContent>{formatDateTime(d)}</TooltipContent>
    </Tooltip>
  )
}
