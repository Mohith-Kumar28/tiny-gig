import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { getPushConfig, removePushSubscription, savePushSubscription } from '../server/push'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/**
 * Opt in to phone/desktop alerts. New gigs only stay open for interest for a few minutes,
 * so this is the fastest way to hear about them (§4.1).
 */
export function PushToggle({ className }: { className?: string }) {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['me', 'push'], queryFn: () => getPushConfig() })
  const [supported, setSupported] = useState(false)
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(ok)
    if (!ok) return
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEndpoint(sub?.endpoint ?? null))
      .catch(() => undefined)
  }, [])
  if (!supported || !data?.publicKey) return null
  const on = !!endpoint && data.endpoints.includes(endpoint)

  const toggle = async (next: boolean) => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      if (next) {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') {
          toast.error('Notifications are blocked. Allow them in your browser settings.')
          return
        }
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(data.publicKey ?? '') }))
        const json = sub.toJSON()
        await savePushSubscription({ data: { endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' } })
        setEndpoint(sub.endpoint)
        toast.success('Alerts on for this device')
      } else {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await removePushSubscription({ data: { endpoint: sub.endpoint } })
          await sub.unsubscribe()
        }
        setEndpoint(null)
        toast.success('Alerts off for this device')
      }
      await qc.invalidateQueries({ queryKey: ['me', 'push'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change alerts')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('flex items-center gap-3 rounded-xl border bg-card p-4', className)}>
      <BellRing className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">New-gig alerts on this device</p>
        <p className="text-xs text-muted-foreground">Gigs only take interest for a few minutes. Get a ping the moment one goes live.</p>
      </div>
      <Switch checked={on} disabled={busy} onCheckedChange={toggle} aria-label="New-gig alerts" />
    </div>
  )
}
