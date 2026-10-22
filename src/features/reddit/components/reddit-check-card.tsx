import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink, RefreshCw, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useAction } from '@/hooks/use-action'
import { getRedditCheckStatus, recheckAccounts, saveRedditCreds } from '../server/reddit'

/**
 * Connect the automatic live check: a free app on reddit.com/prefs/apps gives an ID and a secret.
 * Once connected, posts are checked every 15 minutes and accounts (karma, suspensions) daily.
 */
export function RedditCheckCard() {
  const { data, isLoading, refetch, isFetching } = useQuery({ queryKey: ['admin', 'reddit-status'], queryFn: () => getRedditCheckStatus() })
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const save = useAction(() => saveRedditCreds({ data: { clientId, clientSecret } }), {
    success: (r) => (r.ok ? 'Connected to Reddit' : null),
    invalidate: [['admin', 'reddit-status']],
    onSuccess: (r) => {
      if (!r.ok) toast.error(`Reddit didn’t accept these: ${r.error}`)
      else {
        setClientId('')
        setClientSecret('')
      }
    },
  })
  const accounts = useAction(() => recheckAccounts(), {
    success: (r) => ('skipped' in r && r.skipped ? 'Not connected yet' : `Checked ${r.checked} account${r.checked === 1 ? '' : 's'} with Reddit`),
    invalidate: [['admin', 'accounts']],
  })
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-semibold">Automatic live check (Reddit)</h2>
        <p className="text-sm text-muted-foreground">
          Checks every submitted Reddit post every 15 minutes: still up, removed and by whom, and posted from the right account. Once a day it
          also refreshes each account’s karma and spots suspended or vanished accounts. Problems are flagged for you; nothing is rejected
          automatically.
        </p>
      </div>
      <div className="space-y-4 rounded-xl border bg-card p-4">
        {isLoading ? (
          <Skeleton className="h-6 w-60" />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {data?.ok ? <CheckCircle2 className="size-5 text-success" /> : <XCircle className="size-5 text-muted-foreground" />}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{data?.ok ? 'Connected' : data?.configured ? 'Saved, but Reddit isn’t answering' : 'Not connected'}</p>
              <p className="text-xs text-muted-foreground">
                {data?.ok
                  ? `App ${data.clientIdHint} · ${data.source === 'cloudflare' ? 'from Cloudflare secrets' : 'saved here'}`
                  : data?.configured
                    ? data.error
                    : 'Add your Reddit app below to switch it on.'}
              </p>
            </div>
            <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
              <RefreshCw /> Test
            </Button>
            {data?.ok ? (
              <Button variant="outline" size="sm" disabled={accounts.isPending} onClick={() => accounts.mutate(undefined)}>
                {accounts.isPending ? <Spinner /> : null}Check accounts now
              </Button>
            ) : null}
          </div>
        )}
        {data?.source !== 'cloudflare' ? (
          <form
            className="space-y-3 border-t pt-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (clientId && clientSecret) save.mutate(undefined)
            }}
          >
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                Signed in to any Reddit account you own, open{' '}
                <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-foreground underline">
                  reddit.com/prefs/apps <ExternalLink className="size-3" />
                </a>{' '}
                and click “create another app”.
              </li>
              <li>Name it “TinyGig live check”, choose “script”, and put any URL (e.g. https://tinygig.app) as the redirect URI.</li>
              <li>Copy the ID (the short code under the app name) and the secret, and paste them here.</li>
            </ol>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="reddit-id">App ID</Label>
                <Input id="reddit-id" autoComplete="off" value={clientId} onChange={(e) => setClientId(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reddit-secret">Secret</Label>
                <Input id="reddit-secret" type="password" autoComplete="off" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
              </div>
            </div>
            <Button type="submit" size="sm" disabled={!clientId || !clientSecret || save.isPending}>
              {save.isPending ? <Spinner /> : null}
              {data?.configured ? 'Replace and connect' : 'Connect'}
            </Button>
          </form>
        ) : null}
      </div>
    </section>
  )
}
