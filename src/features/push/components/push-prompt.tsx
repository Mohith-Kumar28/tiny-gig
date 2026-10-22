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
export function PushPrompt() {
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
    <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/[0.05] p-4 sm:flex-row sm:items-center">
      <BellRing className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Don’t miss new gigs</p>
        <p className="text-xs text-muted-foreground">Gigs take interest for only a few minutes. Turn on alerts and we’ll ping you the moment one goes live.</p>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={async () => {
            const ok = await enable().catch(() => false)
            if (ok) toast.success('Alerts on. You’ll hear about new gigs right away.')
            else {
              toast.error('Alerts are blocked. You can allow them later from Notifications.')
              snooze()
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
