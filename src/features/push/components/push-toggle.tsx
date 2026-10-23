import { BellOff, BellRing, Send, Share } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { pluralize } from '@/lib/format'
import { cn } from '@/lib/utils'
import { osNotificationSettings, pushErrorToast, showPushError, siteSettingsUrl, waitForPushArrival } from '../push-errors'
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

/** "Chrome on Mac" from a stored user agent, good enough to recognise your own devices. */
function deviceName(ua: string | null) {
  if (!ua) return 'Unknown browser'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : ''
  return os ? `${browser} on ${os}` : browser
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
  const { state, busy, enable, disable, others, disableOthers } = usePush()
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
      // Make sure the tab is listening to the latest service worker before we send.
      await navigator.serviceWorker?.getRegistration().then((reg) => reg?.update()).catch(() => {})
      const arrived = waitForPushArrival(20_000)
      const r = await sendTestPush()
      if (!r.devices) toast.error('No device is set up yet. Turn alerts on first.')
      else if (!r.configured) toast.error('Push is not set up on the server yet (VAPID keys missing).')
      else if (r.sent) {
        const id = toast.loading('Test sent. Waiting for it to reach this browser…')
        if (await arrived) {
          const os = osNotificationSettings()
          toast.success('This browser received the test alert', {
            id,
            duration: 30_000,
            description: os
              ? `Didn't see a pop-up? Then your computer is hiding it, not TinyGig. In ${os.where}, allow notifications and pick Banners or Alerts, and turn off Focus / Do Not Disturb.`
              : nothingShowedHint(),
            action: os ? { label: os.label, onClick: () => window.location.assign(os.url) } : undefined,
          })
        } else {
          toast.error('The test alert didn’t reach this browser', {
            id,
            duration: 30_000,
            description:
              r.sent > 1
                ? 'It may have gone to another of your devices. If this one should get alerts, turn the switch off and on again here, then retry.'
                : 'Turn the switch off and on again on this device, then retry. Alerts only arrive while the browser is running.',
          })
        }
      } else
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
        else pushErrorToast('Notifications are blocked for TinyGig in this browser', unblockHint(), siteSettingsUrl())
      } else {
        await disable()
        toast.success('Alerts off for this device')
      }
    } catch (err) {
      showPushError(err)
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
        {others.length ? (
          <div className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <p>
              Alerts are also on for {pluralize(others.length, 'other browser')} on your account:{' '}
              {others
                .map((d) => `${deviceName(d.userAgent)} (since ${new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`)
                .join(', ')}
              . This switch only controls this browser.
            </p>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              disabled={busy}
              onClick={() =>
                disableOthers().then(
                  () => toast.success('Alerts turned off on your other browsers'),
                  () => toast.error('Could not turn them off. Try again.'),
                )
              }
            >
              <BellOff className="size-3.5" /> Turn off on {others.length === 1 ? 'that browser' : 'those browsers'}
            </Button>
          </div>
        ) : null}
      </div>
      {state === 'on' || state === 'off' ? (
        <Switch checked={state === 'on'} disabled={busy} onCheckedChange={toggle} aria-label={copy.title} />
      ) : null}
    </div>
  )
}
