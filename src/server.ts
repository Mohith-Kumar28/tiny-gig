import handler from '@tanstack/react-start/server-entry'
import { runScheduled } from './worker-scheduled'

export default {
  fetch: (request, env) => {
    // The old *.workers.dev address still answers; send it to the real domain so sign-in
    // cookies, Google OAuth and push subscriptions all live on one origin.
    const url = new URL(request.url)
    const canonical = new URL(env.APP_URL)
    if (url.hostname.endsWith('.workers.dev') && canonical.protocol === 'https:') {
      url.protocol = canonical.protocol
      url.host = canonical.host
      return Response.redirect(url.toString(), 301)
    }
    return handler.fetch(request)
  },
  scheduled(controller, _env, ctx) {
    ctx.waitUntil(runScheduled(controller.scheduledTime))
  },
} satisfies ExportedHandler<Env>
