import { BellOff, BellRing, Send, Share } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { sendTestPush } from '../server/push'
import { isIos, usePush } from '../use-push'

/** How to undo a block, by browser. People often hit "Block" by reflex; this is the way back. */
/** The push left our server fine; if nothing appears, the OS or browser is hiding it. */
function nothingShowedHint() {
  if (typeof navigator === 'undefined') return ''
  const ua = navigator.userAgent
  if (isIos()) return 'Nothing showed? Check iPhone Settings → Notifications → TinyGig, and that Focus is off.'
  if (/Android/.test(ua)) return 'Nothing showed? Check Android Settings → Apps → your browser → Notifications.'
  if (/Mac OS X/.test(ua))
    return 'Nothing showed? Open Mac System Settings → Notifications → your browser (Chrome, Brave…) and allow notifications, and turn off Focus / Do Not Disturb. The browser must stay running; closing the tab is fine.'
  return 'Nothing showed? Check your system notification settings for this browser, and that Do Not Disturb is off. The browser must stay running; closing the tab is fine.'
}

function unblockHint() {
  if (typeof navigator === 'undefined') return ''
  const ua = navigator.userAgent
  if (isIos()) return 'Open iPhone Settings → Notifications → TinyGig and allow notifications.'
  if (/Android/.test(ua))
    return 'Tap the lock icon next to the address (or the ⋮ menu → Site settings) → Notifications → Allow, then come back.'
  if (/Safari/.test(ua) && !/Chrome/.test(ua))
    return 'Safari → Settings → Websites → Notifications → set TinyGig to Allow, then come back.'
  return 'Click the lock icon next to the address bar → Notifications → Allow, then reload this page.'
}

/**
 * The settings switch for new-gig alerts on this device (Notifications page, Me, Profile).
 * Explains blocked and iPhone-install cases instead of silently failing.
 */
const COPY = {
  worker: {
    title: 'New-gig alerts on this device',
    body: 'Gigs only take interest for a few minutes. Get a ping the moment one goes live.',
  },
  admin: {
    title: 'Alerts on this device',
    body: 'New applicants, proof to review, first hands on a gig and the Monday payout run.',
  },
}

export function PushToggle({ className, audience = 'worker' }: { className?: string; audience?: keyof typeof COPY }) {
  const { state, busy, enable, disable } = usePush()
  const [testing, setTesting] = useState(false)
  const copy = COPY[audience]
  if (state === 'loading') return null
  if (state === 'unsupported') {
    return (
      <div className={cn('flex items-start gap-3 rounded-lg border bg-card p-4', className)}>
        <BellOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium">{copy.title}</p>
          <p className="text-xs text-muted-foreground">
            This browser can't show push alerts. Use Chrome, Edge or Firefox, or Safari with TinyGig added to your Home Screen.
            You'll still see everything under the bell.
          </p>
        </div>
      </div>
    )
  }
  const test = async () => {
    setTesting(true)
    try {
      const r = await sendTestPush()
      if (!r.devices) toast.error('No device is set up yet. Turn alerts on first.')
      else if (!r.configured) toast.error('Push is not set up on the server yet (VAPID keys missing).')
      else if (r.sent)
        toast.success(`Test sent to ${r.sent} device${r.sent === 1 ? '' : 's'}. It should pop up in a few seconds.`, {
          duration: 15000,
          description: nothingShowedHint(),
        })
      else
        toast.error('The push service refused the test', {
          duration: 15000,
          description: `${r.failed[0]?.status ?? ''} ${r.failed[0]?.detail ?? ''}`.trim() || 'Turn alerts off and on again, then retry.',
        })
    } catch {
      toast.error('Could not send the test')
    } finally {
      setTesting(false)
    }
  }
  const toggle = async (next: boolean) => {
    try {
      if (next) {
        const ok = await enable()
        if (ok) toast.success('Alerts on for this device')
        else toast.error('Notifications are blocked for TinyGig in this browser', { description: unblockHint() })
      } else {
        await disable()
        toast.success('Alerts off for this device')
      }
    } catch (err) {
      toast.error('Could not turn alerts on', { description: err instanceof Error ? err.message : undefined, duration: 12_000 })
    }
  }
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border bg-card p-4', className)}>
      {state === 'denied' ? (
        <BellOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      ) : (
        <BellRing className={cn('mt-0.5 size-5 shrink-0', state === 'on' ? 'text-ink' : 'text-muted-foreground')} />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{copy.title}</p>
        {state === 'needs-install' ? (
          <p className="text-xs text-muted-foreground">
            On iPhone, alerts work once TinyGig is on your Home Screen: tap{' '}
            <Share className="inline size-3.5 align-text-bottom" /> Share → <strong>Add to Home Screen</strong>, open TinyGig from
            there, and turn this on.
          </p>
        ) : state === 'denied' ? (
          <p className="text-xs text-muted-foreground">Notifications are blocked for TinyGig. {unblockHint()}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{copy.body}</p>
        )}
        {state === 'on' ? (
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" disabled={testing} onClick={test}>
            <Send className="size-3.5" /> {testing ? 'Sending…' : 'Send a test alert'}
          </Button>
        ) : null}
      </div>
      {state === 'on' || state === 'off' ? (
        <Switch checked={state === 'on'} disabled={busy} onCheckedChange={toggle} aria-label={copy.title} />
      ) : null}
    </div>
  )
}
