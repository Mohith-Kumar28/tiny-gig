import { toast } from 'sonner'

/** Browser settings pages (brave://, chrome://, edge://) can't be opened by a website, only pasted into the address bar. */
export class PushSetupError extends Error {
  constructor(
    message: string,
    readonly settingsUrl?: string,
  ) {
    super(message)
  }
}

function browserScheme() {
  if (typeof navigator === 'undefined') return null
  if ('brave' in navigator) return 'brave'
  const ua = navigator.userAgent
  if (/Edg\//.test(ua)) return 'edge'
  if (/Chrome\//.test(ua) && !/OPR\//.test(ua)) return 'chrome'
  return null
}

/** The page where this browser lets you allow notifications for this site, when it has one. */
export function siteSettingsUrl() {
  const scheme = browserScheme()
  if (!scheme || typeof location === 'undefined') return undefined
  return `${scheme}://settings/content/siteDetails?site=${encodeURIComponent(location.origin)}`
}

async function copySettingsLink(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    toast.success('Settings link copied', {
      description: 'Paste it into the address bar and press Enter. Browsers don’t let websites open their settings pages directly.',
      duration: 12_000,
    })
  } catch {
    toast.message('Copy this into the address bar', { description: url, duration: 20_000 })
  }
}

/** Error toast with a "Copy settings link" button when there's a settings page to send the person to. */
export function pushErrorToast(title: string, description?: string, settingsUrl?: string) {
  toast.error(title, {
    description,
    duration: 20_000,
    action: settingsUrl ? { label: 'Copy settings link', onClick: () => void copySettingsLink(settingsUrl) } : undefined,
  })
}

/** Toast for anything `enable()` throws. */
export function showPushError(err: unknown) {
  pushErrorToast(
    'Could not turn alerts on',
    err instanceof Error ? err.message : undefined,
    err instanceof PushSetupError ? err.settingsUrl : undefined,
  )
}
