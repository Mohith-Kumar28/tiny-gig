import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

/** Clears cached data and sends the user to their home after any sign-in. */
export function useFinishSignIn(redirectTo?: string) {
  const router = useRouter()
  const qc = useQueryClient()
  return async () => {
    qc.clear()
    await router.invalidate()
    await router.navigate({ to: redirectTo ?? '/app' })
  }
}
