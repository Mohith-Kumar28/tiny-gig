import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-display text-2xl font-semibold">Something went wrong</p>
      <p className="max-w-md text-sm text-muted-foreground">{error instanceof Error ? error.message : "Unexpected error"}</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.invalidate()}>
          Try again
        </Button>
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  )
}
