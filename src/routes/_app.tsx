import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireViewer } from '@/features/auth/guards'
import { viewerQuery } from '@/features/auth/queries'

/** Every authenticated page lives under this pathless layout. */
export const Route = createFileRoute('/_app')({
  head: () => ({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] }),
  // Who is signed in is fetched once and kept in memory; page changes read the cache.
  // Security doesn't depend on this: every server function checks the session itself,
  // and a "not signed in" reply sends the browser to /login (see router.tsx).
  // Sign-in/out clears the cache; useAction marks it stale after any change.
  beforeLoad: async ({ context, location }) => {
    const viewer = requireViewer(await context.queryClient.fetchQuery({ ...viewerQuery(), staleTime: Number.POSITIVE_INFINITY }), location.href)
    return { viewer }
  },
  component: Outlet,
})
