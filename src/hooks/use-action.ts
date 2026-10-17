import { type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

export function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err && 'message' in err) return String((err as { message: unknown }).message)
  return 'Something went wrong'
}

/**
 * Mutation wrapper for server functions: toasts success/error, invalidates
 * query prefixes and the router so loaders refetch.
 */
export function useAction<TVars, TResult>(
  fn: (vars: TVars) => Promise<TResult>,
  opts: {
    success?: string | ((r: TResult, v: TVars) => string | null)
    invalidate?: QueryKey[]
    onSuccess?: (r: TResult, v: TVars) => void | Promise<void>
    onError?: (err: unknown) => void
  } = {},
) {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: fn,
    onSuccess: async (r, v) => {
      const msg = typeof opts.success === 'function' ? opts.success(r, v) : opts.success
      if (msg) toast.success(msg)
      await Promise.all((opts.invalidate ?? []).map((k) => qc.invalidateQueries({ queryKey: k })))
      await opts.onSuccess?.(r, v)
      router.invalidate()
    },
    onError: (err) => {
      toast.error(errorMessage(err))
      opts.onError?.(err)
    },
  })
}
