import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

/** A missing page reads as a struck-out ledger entry. */
export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="ledger-label">Error 404</p>
      <p className="font-display text-4xl font-extrabold">
        <span className="ledger-struck">This page</span>
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">There is no page at this address. It may have moved, or the link was mistyped.</p>
      <Button asChild className="mt-2">
        <Link to="/">Back to TinyGig</Link>
      </Button>
    </div>
  )
}
