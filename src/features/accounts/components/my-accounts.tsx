import { Check, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { PlatformIcon } from '@/components/shared/platform-icon'
import { formatDate } from '@/components/shared/relative-time'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AccountLossNotice } from '@/features/consent/components/account-loss-notice'
import { useAction } from '@/hooks/use-action'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { accountLabel, formatAge, istDayKey, LEVEL_LABELS } from '../rules'
import { addMyAccount, type listMyAccounts, removeMyAccount, updateMyAccount } from '../server/my-accounts'
import { LevelBadge, platformIconFor } from './account-columns'
import { AddAccountDialog } from './add-account-dialog'

type Account = Awaited<ReturnType<typeof listMyAccounts>>[number]

function KarmaQuickEdit({ a }: { a: Account }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const save = useAction((karma: number) => updateMyAccount({ data: { id: a.id, karma } }), {
    success: 'Karma updated',
    invalidate: [['w', 'accounts']],
    onSuccess: () => setOpen(false),
  })
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setDraft(a.karma == null ? '' : String(a.karma))
      }}
    >
      <PopoverTrigger asChild>
        <Button variant={a.karmaStale ? 'default' : 'outline'} size="sm" className="h-7 text-xs">
          <Pencil /> Update karma
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2 p-3">
        <p className="text-xs text-muted-foreground">Your current karma on {accountLabel(a.platform, a.handle)}</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (draft !== '') save.mutate(Math.max(0, Math.round(Number(draft))))
          }}
        >
          <Input autoFocus type="number" inputMode="numeric" min={0} value={draft} onChange={(e) => setDraft(e.target.value)} className="h-8" />
          <Button type="submit" size="sm" className="h-8" disabled={save.isPending}>
            <Check />
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}

function CreatedOnQuickEdit({ a }: { a: Account }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const save = useAction((createdOn: string) => updateMyAccount({ data: { id: a.id, createdOn } }), {
    success: 'Date saved',
    invalidate: [['w', 'accounts']],
    onSuccess: () => setOpen(false),
  })
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setDraft(a.createdOn ? istDayKey(a.createdOn) : '')
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className="underline decoration-dotted underline-offset-2 hover:text-foreground">
          {a.createdOn ? formatDate(a.createdOn) : 'add date'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-2 p-3">
        <p className="text-xs text-muted-foreground">When was this account created? Check its “Cake day”.</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (draft) save.mutate(draft)
          }}
        >
          <Input autoFocus type="date" max={istDayKey(new Date())} value={draft} onChange={(e) => setDraft(e.target.value)} className="h-8" />
          <Button type="submit" size="sm" className="h-8" disabled={save.isPending || !draft}>
            <Check />
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}

function AccountCard({ a }: { a: Account }) {
  const remove = useAction(() => removeMyAccount({ data: { id: a.id } }), { success: 'Account removed', invalidate: [['w', 'accounts']] })
  const reddit = a.platform === 'reddit'
  return (
    <li className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <PlatformIcon platform={platformIconFor(a.platform)} className="mt-0.5 size-5" />
        <div className="min-w-0 flex-1">
          <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">
            {accountLabel(a.platform, a.handle)}
            <ExternalLink className="size-3 opacity-60" />
          </a>
          {reddit ? (
            <p className="text-xs text-muted-foreground">
              Created{' '}
              {a.createdOnConfirmed ? (a.createdOn ? formatDate(a.createdOn) : '—') : <CreatedOnQuickEdit a={a} />} · {formatAge(a.ageDays)} old ·{' '}
              {a.tasksDone} task{a.tasksDone === 1 ? '' : 's'} done
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {a.standing !== 'active' ? <StatusBadge status={a.standing} /> : null}
          {reddit ? <LevelBadge level={a.level} /> : null}
        </div>
      </div>
      {reddit ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className={cn('text-sm', a.karmaStale && 'text-muted-foreground')}>
            <span className="font-medium tabular">{a.karma == null ? '—' : formatNumber(a.karma)}</span> karma
            <span className="text-xs text-muted-foreground">
              {' '}
              · {a.karmaUpdatedAt ? `updated ${formatDate(a.karmaUpdatedAt)}` : 'never updated'}
              {a.karmaStale ? ' · please update' : ''}
            </span>
          </div>
          <KarmaQuickEdit a={a} />
        </div>
      ) : null}
      {reddit && a.level === 'warmup' && a.next ? (
        <p className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
          Warming up: build karma and history in the Warm-up tab. Paid gigs open for this account on <strong>{formatDate(a.next.at)}</strong>.
        </p>
      ) : reddit && a.next ? (
        <p className="text-xs text-muted-foreground">
          Reaches {LEVEL_LABELS[a.next.level]} on {formatDate(a.next.at)}. Older accounts earn more per task.
        </p>
      ) : null}
      {a.tasksDone === 0 ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" disabled={remove.isPending} onClick={() => remove.mutate()}>
            <Trash2 /> Remove
          </Button>
        </div>
      ) : null}
    </li>
  )
}

export function MyAccounts({ accounts }: { accounts: Account[] }) {
  const [adding, setAdding] = useState(false)
  const add = useAction(
    (v: { platform: Account['platform']; url: string; createdOn: string; karma: string }) =>
      addMyAccount({ data: { platform: v.platform, url: v.url, createdOn: v.createdOn, karma: v.karma } }),
    { success: 'Account added', invalidate: [['w', 'accounts']], onSuccess: () => setAdding(false) },
  )
  const reddit = accounts.filter((a) => a.platform === 'reddit')
  const others = accounts.filter((a) => a.platform !== 'reddit')
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="My accounts"
        description="Every account you work from. Pay depends on the age of the account that does the task."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus /> Add account
          </Button>
        }
      />
      <AccountLossNotice />
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Reddit</h2>
        <ul className="space-y-3">
          {reddit.map((a) => (
            <AccountCard key={a.id} a={a} />
          ))}
        </ul>
      </section>
      {others.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Other platforms</h2>
          <ul className="space-y-3">
            {others.map((a) => (
              <AccountCard key={a.id} a={a} />
            ))}
          </ul>
        </section>
      ) : null}
      <AddAccountDialog
        open={adding}
        onOpenChange={setAdding}
        description="Add every account you can work from. Each account can only be registered by one person."
        pending={add.isPending}
        onSubmit={(v) => add.mutate(v)}
      />
    </div>
  )
}
