import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { DefaultCatchBoundary } from '@/components/shared/default-catch-boundary'
import { NotFound } from '@/components/shared/not-found'
import { PagePending } from '@/components/shared/page-pending'
import { routeTree } from './routeTree.gen'

function isUnauthorized(err: unknown) {
  const e = err as { code?: string; message?: string } | null
  return e?.code === 'UNAUTHORIZED' || e?.message === 'Please sign in to continue.'
}

export function getRouter() {
  // The server checks the session on every request; the browser only learns it expired
  // when one fails. Then drop cached data and go to sign-in, instead of polling for it.
  const onAuthError = (err: unknown) => {
    if (typeof window === 'undefined' || !isUnauthorized(err)) return
    queryClient.clear()
    const here = window.location.pathname + window.location.search
    if (window.location.pathname !== '/login') void router.navigate({ to: '/login', search: { redirect: here } })
  }
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: onAuthError }),
    mutationCache: new MutationCache({ onError: onAuthError }),
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  })
  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Show the page skeleton almost at once instead of freezing on the old page for
    // the router's default 1s; cached pages render before this ever kicks in.
    defaultPendingMs: 120,
    defaultPendingMinMs: 250,
    defaultPendingComponent: PagePending,
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: NotFound,
  })
  setupRouterSsrQueryIntegration({ router, queryClient })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
