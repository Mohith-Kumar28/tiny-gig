import { BellOff, BellRing, Share } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { isIos, usePush } from '../use-push'

/** How to undo a block, by browser. People often hit "Block" by reflex; this is the way back. */
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
export function PushToggle({ className }: { className?: string }) {
  const { state, busy, enable, disable } = usePush()
  if (state === 'loading' || state === 'unsupported') return null
  const toggle = async (next: boolean) => {
    try {
      if (next) {
        const ok = await enable()
        toast[ok ? 'success' : 'error'](
          ok ? 'Alerts on for this device' : 'Notifications are blocked for TinyGig in this browser',
        )
      } else {
        await disable()
        toast.success('Alerts off for this device')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change alerts')
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
        <p className="text-sm font-medium">New-gig alerts on this device</p>
        {state === 'needs-install' ? (
          <p className="text-xs text-muted-foreground">
            On iPhone, alerts work once TinyGig is on your Home Screen: tap{' '}
            <Share className="inline size-3.5 align-text-bottom" /> Share → <strong>Add to Home Screen</strong>, open TinyGig from
            there, and turn this on.
          </p>
        ) : state === 'denied' ? (
          <p className="text-xs text-muted-foreground">Notifications are blocked for TinyGig. {unblockHint()}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Gigs only take interest for a few minutes. Get a ping the moment one goes live.
          </p>
        )}
      </div>
      {state === 'on' || state === 'off' ? (
        <Switch checked={state === 'on'} disabled={busy} onCheckedChange={toggle} aria-label="New-gig alerts" />
      ) : null}
    </div>
  )
}
