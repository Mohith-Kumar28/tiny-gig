import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireViewer } from '@/features/auth/guards'
import { getViewer } from '@/features/auth/server/viewer'

/** Every authenticated page lives under this pathless layout. */
export const Route = createFileRoute('/_app')({
  head: () => ({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] }),
  beforeLoad: async ({ location }) => {
    const viewer = requireViewer(await getViewer(), location.href)
    return { viewer }
  },
  component: Outlet,
})
