import handler from '@tanstack/react-start/server-entry'
import { runScheduled } from './worker-scheduled'

export default {
  fetch: (request) => handler.fetch(request),
  scheduled(controller, _env, ctx) {
    ctx.waitUntil(runScheduled(controller.scheduledTime))
  },
} satisfies ExportedHandler<Env>
