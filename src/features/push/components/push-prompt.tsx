import { BellRing, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { usePush } from '../use-push'

const SNOOZE_KEY = 'tg:push-prompt-snoozed-until'
const SNOOZE_DAYS = 14

/**
 * A soft ask before the browser's own permission popup. The browser prompt only appears after the
 * person taps "Turn on", so a reflex "Block" is far less likely. "Not now" snoozes it for two weeks;
 * the switch in Notifications / Profile is always there.
 */
const COPY = {
  worker: {
    title: 'Don’t miss new gigs',
    body: 'Gigs take interest for only a few minutes. Turn on alerts and we’ll ping you the moment one goes live.',
    done: 'Alerts on. You’ll hear about new gigs right away.',
    where: 'Notifications',
  },
  admin: {
    title: 'Get pinged when work comes in',
    body: 'New applicants, proof to review, first hands on a gig and the Monday payout run, on this device.',
    done: 'Alerts on for this device.',
    where: 'Account',
  },
}

export function PushPrompt({ audience = 'worker' }: { audience?: keyof typeof COPY }) {
  const copy = COPY[audience]
  const { state, busy, enable } = usePush()
  const [snoozed, setSnoozed] = useState(true)
  useEffect(() => {
    setSnoozed(Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now())
  }, [])
  if (snoozed || state !== 'off') return null
  const snooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86_400_000))
    setSnoozed(true)
  }
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 gap-3">
        <BellRing className="mt-0.5 size-5 shrink-0 text-ink" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{copy.title}</p>
          <p className="text-xs text-muted-foreground">{copy.body}</p>
        </div>
      </div>
      <div className="flex gap-2 sm:shrink-0">
        <Button
          size="sm"
          disabled={busy}
          onClick={async () => {
            try {
              if (await enable()) toast.success(copy.done)
              else {
                toast.error(`Alerts are blocked in this browser. You can allow them later from ${copy.where}.`)
                snooze()
              }
            } catch (err) {
              toast.error('Could not turn alerts on', {
                description: err instanceof Error ? err.message : undefined,
                duration: 12_000,
              })
            }
          }}
        >
          Turn on alerts
        </Button>
        <Button size="sm" variant="ghost" onClick={snooze} aria-label="Not now">
          <X /> Not now
        </Button>
      </div>
    </div>
  )
}
