import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { getPushConfig, removePushSubscription, savePushSubscription } from './server/push'

/**
 * Where this device stands on push alerts:
 *  - unsupported:   browser can't do web push at all
 *  - needs-install: iPhone/iPad Safari — push only works after "Add to Home Screen"
 *  - denied:        the person blocked notifications; only browser settings can undo it
 *  - off / on:      ready to toggle
 */
export type PushState = 'loading' | 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export function isIos() {
  return typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandalone() {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true)
  )
}

export function usePush() {
  const qc = useQueryClient()
  const { data: config } = useQuery({ queryKey: ['me', 'push'], queryFn: () => getPushConfig(), staleTime: 60_000 })
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const [env, setEnv] = useState<'loading' | 'unsupported' | 'needs-install' | 'ready'>('loading')
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!supported) {
      setEnv(isIos() && !isStandalone() ? 'needs-install' : 'unsupported')
      return
    }
    setPermission(Notification.permission)
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEndpoint(sub?.endpoint ?? null))
      .catch(() => undefined)
      .finally(() => setEnv('ready'))
  }, [])

  const state: PushState =
    env === 'loading' || !config
      ? 'loading'
      : env !== 'ready'
        ? env
        : !config.publicKey
        ? 'unsupported'
        : permission === 'denied'
          ? 'denied'
          : endpoint && config.endpoints.includes(endpoint)
            ? 'on'
            : 'off'

  const enable = useCallback(async () => {
    if (!config?.publicKey) return false
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return false
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(config.publicKey) }))
      const json = sub.toJSON()
      await savePushSubscription({ data: { endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' } })
      setEndpoint(sub.endpoint)
      await qc.invalidateQueries({ queryKey: ['me', 'push'] })
      return true
    } finally {
      setBusy(false)
    }
  }, [config?.publicKey, qc])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await removePushSubscription({ data: { endpoint: sub.endpoint } })
        await sub.unsubscribe()
      }
      setEndpoint(null)
      await qc.invalidateQueries({ queryKey: ['me', 'push'] })
    } finally {
      setBusy(false)
    }
  }, [qc])

  return { state, busy, enable, disable }
}
