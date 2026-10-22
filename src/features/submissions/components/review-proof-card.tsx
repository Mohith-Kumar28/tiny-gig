import { ExternalLink, Link2 } from 'lucide-react'
import { CopyButton } from '@/components/shared/copy-button'
import { Kbd } from '@/components/ui/kbd'

function host(url: string) {
  try {
    const u = new URL(url)
    return { host: u.hostname.replace(/^www\./, ''), path: `${u.pathname}${u.search}` }
  } catch {
    return { host: url, path: '' }
  }
}

export function ReviewProofCard({ url, targetUrl }: { url: string | null; targetUrl?: string | null }) {
  if (!url) {
    return <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No proof link submitted yet.</div>
  }
  const h = host(url)
  return (
    <div className="space-y-2">
      <div className="flex items-stretch overflow-hidden rounded-lg border bg-card">
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="group flex min-w-0 flex-1 items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <Link2 className="size-4 shrink-0 text-ink" />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink group-hover:underline">{h.host}</span>
            <span className="block truncate font-mono text-xs text-muted-foreground">{h.path}</span>
          </span>
          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Kbd className="hidden lg:inline-flex">O</Kbd>
            <ExternalLink className="size-4 group-hover:text-foreground" />
          </span>
        </a>
        <div className="flex items-center border-l px-1">
          <CopyButton value={url} />
        </div>
      </div>
      {targetUrl ? (
        <p className="truncate text-xs text-muted-foreground">
          Target:{' '}
          <a href={targetUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            {targetUrl}
          </a>
        </p>
      ) : null}
    </div>
  )
}
