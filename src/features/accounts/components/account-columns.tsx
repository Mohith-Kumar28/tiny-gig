import { StatusBadge } from '@/components/shared/status-badge'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { CircleDot, ExternalLink } from 'lucide-react'
import { PlatformIcon } from '@/components/shared/platform-icon'
import { formatDate, RelativeTime } from '@/components/shared/relative-time'
import { WhatsAppIcon, whatsappLink } from '@/components/shared/whatsapp-icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Platform } from '@/db/schema/enums'
import { cn } from '@/lib/utils'
import { accountLabel, communityLabel, formatAge, LEVEL_LABELS } from '../rules'
import type { RosterRow } from '../server/roster'
import { ClientsEditor, CreatedOnEditor, KarmaEditor, StandingSelect } from './account-editors'

export function platformIconFor(platform: string): Platform {
  return platform === 'facebook' ? 'other' : (platform as Platform)
}

export function LevelBadge({ level, className }: { level: string | null; className?: string }) {
  if (!level) return <span className="text-muted-foreground">—</span>
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-md border px-1 text-[0.7rem] leading-none font-semibold tracking-[0.04em] tabular uppercase',
        level === 'warmup'
          ? 'border-dashed border-muted-foreground/50 text-muted-foreground'
          : 'border-foreground/30 bg-card text-foreground',
        className,
      )}
    >
      {LEVEL_LABELS[level as keyof typeof LEVEL_LABELS] ?? level}
    </span>
  )
}

export const accountColumns: ColumnDef<RosterRow, unknown>[] = [
  {
    id: 'handle',
    header: 'Account',
    meta: { sortKey: 'handle' },
    cell: ({ row }) => {
      const r = row.original
      return (
        <div className="flex min-w-0 items-center gap-2">
          <PlatformIcon platform={platformIconFor(r.platform)} />
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="group inline-flex min-w-0 items-center gap-1 font-medium hover:underline"
          >
            <span className="truncate">{accountLabel(r.platform, r.handle)}</span>
            <ExternalLink className="size-3 shrink-0 opacity-0 group-hover:opacity-60" />
          </a>
        </div>
      )
    },
  },
  {
    id: 'owner',
    header: 'Owner',
    meta: { sortKey: 'owner', label: 'Owner' },
    cell: ({ row }) => (
      <Link
        to="/admin/workers/$userId"
        params={{ userId: row.original.workerId }}
        onClick={(e) => e.stopPropagation()}
        className="block max-w-40 truncate hover:underline"
      >
        {row.original.ownerName ?? 'Unknown'}
      </Link>
    ),
  },
  {
    id: 'level',
    header: 'Level',
    meta: { sortKey: 'level', label: 'Level / age' },
    cell: ({ row }) => {
      const r = row.original
      return (
        <CreatedOnEditor id={r.id} createdOn={r.createdOn} confirmed={!!r.createdOnConfirmedAt}>
          <span className="inline-flex items-center gap-1.5">
            <LevelBadge level={r.level} />
            <span className="text-xs text-muted-foreground tabular">{formatAge(r.ageDays)}</span>
            {r.createdOn && !r.createdOnConfirmedAt ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <CircleDot className="size-3 text-warning" />
                </TooltipTrigger>
                <TooltipContent>Creation date not confirmed yet ({formatDate(r.createdOn)})</TooltipContent>
              </Tooltip>
            ) : null}
          </span>
        </CreatedOnEditor>
      )
    },
  },
  {
    id: 'karma',
    header: 'Karma',
    meta: { sortKey: 'karma', label: 'Karma', className: 'text-right', headerClassName: 'text-right' },
    cell: ({ row }) => (
      <KarmaEditor
        id={row.original.id}
        karma={row.original.karma}
        updatedAt={row.original.karmaUpdatedAt}
        stale={row.original.karmaStale}
      />
    ),
  },
  {
    id: 'standing',
    header: 'Standing',
    meta: { sortKey: 'standing', label: 'Standing' },
    cell: ({ row }) => {
      const r = row.original
      return (
        <div className="flex flex-col items-start gap-0.5">
          <StandingSelect id={r.id} value={r.standing} />
          {r.cooling ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[11px] text-info">{r.coolingUntil ? `Cooling until ${formatDate(r.coolingUntil)}` : 'Cooling down'}</span>
              </TooltipTrigger>
              {r.coolingReason ? <TooltipContent>{r.coolingReason}</TooltipContent> : null}
            </Tooltip>
          ) : r.lastChange ? (
            <span className="text-[11px] text-muted-foreground">
              {r.lastChange.by ?? 'System'} · <RelativeTime date={r.lastChange.at} />
            </span>
          ) : null}
        </div>
      )
    },
  },
  {
    id: 'inUse',
    header: 'In use',
    meta: { sortKey: 'inUse', label: 'In use' },
    cell: ({ row }) =>
      row.original.inUse ? (
        <StatusBadge status="claimed" label="In use" />
      ) : row.original.free ? (
        <span className="text-xs font-medium text-success">Free</span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    id: 'lastActivity',
    header: 'Last activity',
    meta: { sortKey: 'lastActivity', label: 'Last activity' },
    cell: ({ row }) => <RelativeTime date={row.original.lastActivityAt} className="text-muted-foreground" />,
  },
  {
    id: 'lastClient',
    header: 'Clients',
    meta: { sortKey: 'lastClient', label: 'Clients' },
    cell: ({ row }) => <ClientsEditor id={row.original.id} value={row.original.clients} last={row.original.lastClient} />,
  },
  {
    id: 'daysSince',
    header: 'Days since',
    meta: {
      sortKey: 'daysSince',
      label: 'Days since last client work',
      className: 'text-right tabular',
      headerClassName: 'text-right',
    },
    cell: ({ row }) =>
      row.original.daysSinceClientWork == null ? (
        <span className="text-muted-foreground">never</span>
      ) : (
        `${row.original.daysSinceClientWork}d`
      ),
  },
  {
    id: 'communities',
    header: 'Communities',
    meta: { sortKey: 'communities', label: 'Communities' },
    cell: ({ row }) => {
      const c = row.original.communities
      if (!c.length) return <span className="text-muted-foreground">—</span>
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block max-w-44 truncate text-xs text-muted-foreground">
              {c.map((x) => communityLabel(x.name)).join(', ')}
            </span>
          </TooltipTrigger>
          <TooltipContent className="space-y-0.5">
            {c.map((x) => (
              <div key={x.name}>
                {communityLabel(x.name)} · {formatDate(x.at)}
              </div>
            ))}
          </TooltipContent>
        </Tooltip>
      )
    },
  },
  {
    id: 'done',
    header: 'Done',
    meta: { sortKey: 'done', label: 'Tasks done', className: 'text-right tabular', headerClassName: 'text-right' },
    cell: ({ row }) => row.original.totalDone,
  },
  {
    id: 'message',
    header: () => <span className="sr-only">Message</span>,
    meta: { label: 'Message', className: 'w-10' },
    cell: ({ row }) => {
      const r = row.original
      if (!r.ownerPhone) return null
      const first = r.ownerName?.split(' ')[0] ?? ''
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={whatsappLink(r.ownerPhone, `Hi ${first}, about your account ${accountLabel(r.platform, r.handle)}: `)}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex size-7 items-center justify-center rounded-md hover:bg-accent"
              aria-label={`WhatsApp ${r.ownerName}`}
            >
              <WhatsAppIcon />
            </a>
          </TooltipTrigger>
          <TooltipContent>WhatsApp {first}</TooltipContent>
        </Tooltip>
      )
    },
  },
]
