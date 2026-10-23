import handler from '@tanstack/react-start/server-entry'
import { runScheduled } from './worker-scheduled'

// Served at the old address instead of a redirect (browsers refuse redirected service worker
// scripts). Browsers that subscribed to alerts there pick this up on their next update check,
// drop the push subscription and unregister, so a device stops getting alerts it can't switch off.
const RETIRED_SW = `self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .getSubscription()
      .then((sub) => sub && sub.unsubscribe())
      .catch(() => {})
      .then(() => self.registration.unregister()),
  )
})
self.addEventListener('push', (event) => {
  event.waitUntil(self.registration.pushManager.getSubscription().then((sub) => sub && sub.unsubscribe()).catch(() => {}))
})
`

export default {
  fetch: (request, env) => {
    // The old *.workers.dev address still answers; send it to the real domain so sign-in
    // cookies, Google OAuth and push subscriptions all live on one origin.
    const url = new URL(request.url)
    const canonical = new URL(env.APP_URL)
    if (url.hostname.endsWith('.workers.dev') && canonical.protocol === 'https:') {
      if (url.pathname === '/sw.js') {
        return new Response(RETIRED_SW, { headers: { 'content-type': 'text/javascript', 'cache-control': 'no-store' } })
      }
      url.protocol = canonical.protocol
      url.host = canonical.host
      return Response.redirect(url.toString(), 301)
    }
    // wrangler.jsonc sends /sw.js through this worker (run_worker_first) so the old address can
    // get RETIRED_SW above; on the real domain it's still the static file.
    if (url.pathname === '/sw.js') return env.ASSETS.fetch(request)
    return handler.fetch(request)
  },
  scheduled(controller, _env, ctx) {
    ctx.waitUntil(runScheduled(controller.scheduledTime))
  },
} satisfies ExportedHandler<Env>
