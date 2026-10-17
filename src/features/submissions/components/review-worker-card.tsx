import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatNumber, initials } from '@/lib/format'

type Worker = {
  userId: string
  fullName: string
  redditUsername: string
  redditUrl: string
  karma: number
  accountAgeMonths: number
  state: string
  image: string | null
}

export function ReviewWorkerCard({ worker, history }: { worker: Worker; history: Record<string, number> }) {
  const approved = history.approved ?? 0
  const rejected = history.rejected ?? 0
  const decided = approved + rejected
  const rate = decided ? Math.round((approved / decided) * 100) : null
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          {worker.image ? <AvatarImage src={worker.image} alt="" /> : null}
          <AvatarFallback className="text-xs">{initials(worker.fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link
            to="/admin/workers/$userId"
            params={{ userId: worker.userId }}
            className="block truncate text-sm font-medium hover:underline"
          >
            {worker.fullName}
          </Link>
          <a
            href={worker.redditUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            u/{worker.redditUsername} <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Karma', value: formatNumber(worker.karma) },
          { label: 'Age', value: `${worker.accountAgeMonths}mo` },
          { label: 'Approved', value: formatNumber(approved) },
          { label: 'Rate', value: rate == null ? '—' : `${rate}%`, warn: rate != null && rate < 70 },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-muted/50 px-1 py-1.5">
            <dd className={`text-sm font-semibold tabular ${s.warn ? 'text-destructive' : ''}`}>{s.value}</dd>
            <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
          </div>
        ))}
      </dl>
      {rejected ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {rejected} past rejection{rejected === 1 ? '' : 's'} · {worker.state}
        </p>
      ) : null}
    </div>
  )
}
