import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { Money } from '@/components/shared/money'
import { PlatformIcon } from '@/components/shared/platform-icon'
import { formatDate, formatDateTime, RelativeTime } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { WhatsAppIcon, whatsappLink } from '@/components/shared/whatsapp-icon'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { accountHistoryQuery } from '../queries'
import { accountAgeDays, accountLabel, communityLabel, formatAge, levelFor } from '../rules'
import { LevelBadge, platformIconFor } from './account-columns'
import { STANDING_LABELS, StandingSelect } from './account-editors'
import { AssignToOpportunity } from '@/features/opportunities/components/assign-to-opportunity'
import { ClientChip } from './client-chip'

const FIELD_LABELS: Record<string, string> = {
  standing: 'Standing',
  standingNote: 'Standing note',
  karma: 'Karma',
  createdOn: 'Creation date',
  createdOnConfirmed: 'Creation date confirmed',
  created: 'Account added',
}

function describeValue(field: string | undefined, v: unknown) {
  if (v == null || v === '') return '—'
  if (field === 'createdOn' && typeof v === 'number') return formatDate(v)
  if (field === 'standing' && typeof v === 'string') return STANDING_LABELS[v as keyof typeof STANDING_LABELS] ?? v
  if (typeof v === 'number') return formatNumber(v)
  return String(v)
}

/** Full history of one account (R2): every task, client, community, link and outcome, plus who changed what (R7). */
export function AccountSheet({ accountId, onOpenChange }: { accountId: string | null; onOpenChange: (open: boolean) => void }) {
  const { data, isLoading } = useQuery({ ...accountHistoryQuery(accountId ?? ''), enabled: !!accountId })
  const a = data?.account
  return (
    <Sheet open={!!accountId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2 font-display text-xl">
            {a ? <PlatformIcon platform={platformIconFor(a.platform)} /> : null}
            {a ? accountLabel(a.platform, a.handle) : 'Account'}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {a ? (
                <>
                  <Link to="/admin/workers/$userId" params={{ userId: a.workerId }} className="hover:underline">
                    {data?.ownerName ?? 'Unknown owner'}
                  </Link>
                  <LevelBadge level={levelFor(a.createdOn)} />
                  <span className="tabular">{formatAge(accountAgeDays(a.createdOn))} old</span>
                </>
              ) : null}
            </div>
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {isLoading || !a ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-3 divide-x rounded-lg border">
                <div className="space-y-1.5 px-3 py-2.5">
                  <dt className="ledger-label">Standing</dt>
                  <dd>
                    <StandingSelect id={a.id} value={a.standing} />
                  </dd>
                </div>
                <div className="space-y-1 px-3 py-2.5">
                  <dt className="ledger-label">Karma</dt>
                  <dd className="font-display text-lg leading-tight font-bold tabular">{a.karma == null ? '—' : formatNumber(a.karma)}</dd>
                  <dd className="text-[11px] text-muted-foreground tabular">
                    {a.karmaUpdatedAt ? `checked ${formatDate(a.karmaUpdatedAt)}` : 'never checked'}
                  </dd>
                </div>
                <div className="space-y-1 px-3 py-2.5">
                  <dt className="ledger-label">Created</dt>
                  <dd className="text-sm font-medium tabular">{a.createdOn ? formatDate(a.createdOn) : '—'}</dd>
                  <dd className={cn('text-[11px]', a.createdOn && !a.createdOnConfirmedAt ? 'text-warning-foreground dark:text-warning' : 'text-muted-foreground')}>
                    {!a.createdOn ? 'not recorded' : a.createdOnConfirmedAt ? 'confirmed' : 'not confirmed yet'}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center gap-2">
                <AssignToOpportunity accountId={a.id} />
                {data.ownerPhone ? (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={whatsappLink(
                        data.ownerPhone,
                        `Hi ${data.ownerName?.split(' ')[0] ?? ''}, about your account ${accountLabel(a.platform, a.handle)}: `,
                      )}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <WhatsAppIcon /> WhatsApp
                    </a>
                  </Button>
                ) : null}
                <Button asChild variant="outline" size="sm">
                  <a href={a.url} target="_blank" rel="noreferrer">
                    <ExternalLink /> Profile
                  </a>
                </Button>
                {data.addedByName ? <span className="ml-auto text-xs text-muted-foreground">Added by {data.addedByName}</span> : null}
              </div>
              {a.standingNote ? (
                <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">{a.standingNote}</p>
              ) : null}

              <section className="space-y-2">
                <h3 className="ledger-label">
                  Work · <span className="tabular">{data.tasks.length}</span>
                </h3>
                {data.tasks.length ? (
                  <ul className="divide-y rounded-lg border">
                    {data.tasks.map((t) => {
                      const cancelled = t.status === 'rejected' || t.status === 'expired' || t.status === 'withdrawn'
                      return (
                        <li key={t.id} className="flex gap-3 px-3 py-2.5 text-sm">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Link
                                to="/admin/gigs/$gigId"
                                params={{ gigId: t.gigId }}
                                className="min-w-0 truncate font-medium hover:underline"
                              >
                                {t.gigTitle}
                              </Link>
                              <StatusBadge status={t.status} />
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {t.clientName ? <ClientChip name={t.clientName} color={t.clientColor ?? 'slate'} /> : null}
                              {t.community ? <span>{communityLabel(t.community)}</span> : null}
                              <span className="tabular">
                                {t.firstSubmittedAt
                                  ? `posted ${formatDateTime(t.firstSubmittedAt)}`
                                  : `assigned ${formatDate(t.claimedAt)}`}
                              </span>
                              {t.decidedAt ? <span className="tabular">decided {formatDate(t.decidedAt)}</span> : null}
                              {t.level ? <span>{t.level}</span> : null}
                              {t.proofUrl ? (
                                <a
                                  href={t.proofUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-ink hover:underline"
                                >
                                  <ExternalLink className="size-3" /> View post
                                </a>
                              ) : null}
                            </div>
                          </div>
                          <Money
                            paise={t.payoutAmount}
                            className={cn('shrink-0 pt-px font-display font-bold', cancelled && 'ledger-struck text-muted-foreground')}
                          />
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                    No work through TinyGig yet. Use Assign to offer this account a gig.
                  </p>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="ledger-label">Changes</h3>
                {data.changes.length ? (
                  <ul className="divide-y rounded-lg border text-sm">
                    {data.changes.map((c) => (
                      <li key={c.id} className="flex items-baseline justify-between gap-3 px-3 py-2">
                        <span className="min-w-0">
                          <span className="font-medium">{c.actorName ?? 'System'}</span>{' '}
                          <span className="text-muted-foreground">
                            {c.meta.field === 'createdOnConfirmed' || c.meta.field === 'created'
                              ? (FIELD_LABELS[c.meta.field] ?? c.action).toLowerCase()
                              : `set ${(FIELD_LABELS[c.meta.field ?? ''] ?? c.action).toLowerCase()} ${describeValue(c.meta.field, c.meta.from)} → ${describeValue(c.meta.field, c.meta.to)}`}
                          </span>
                        </span>
                        <RelativeTime date={c.createdAt} className="shrink-0 text-xs text-muted-foreground" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No edits recorded. Standing, karma and date changes will be listed here with who made them.</p>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
