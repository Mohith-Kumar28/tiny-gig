import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <p className="font-display text-2xl font-semibold">This page doesn't exist</p>
      <Button asChild className="mt-2">
        <Link to="/">Back to TinyGig</Link>
      </Button>
    </div>
  )
}
