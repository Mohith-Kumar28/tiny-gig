import { type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { ACCOUNT_PLATFORMS, type AccountPlatform } from '@/db/schema/enums'
import { istDayKey } from '../rules'

export const ACCOUNT_PLATFORM_LABELS: Record<AccountPlatform, string> = {
  reddit: 'Reddit',
  x: 'X (Twitter)',
  linkedin: 'LinkedIn',
  threads: 'Threads',
  instagram: 'Instagram',
  facebook: 'Facebook',
}

const PLACEHOLDERS: Record<AccountPlatform, string> = {
  reddit: 'https://www.reddit.com/user/yourname',
  x: 'https://x.com/yourname',
  linkedin: 'https://www.linkedin.com/in/yourname',
  threads: 'https://www.threads.net/@yourname',
  instagram: 'https://www.instagram.com/yourname',
  facebook: 'https://www.facebook.com/yourname',
}

export type AddAccountValues = { platform: AccountPlatform; url: string; createdOn: string; karma: string }

/** Shared by "My accounts" (worker) and the roster / worker page (admin, R38). */
export function AddAccountDialog({
  open,
  onOpenChange,
  title = 'Add an account',
  description,
  pending,
  onSubmit,
  extra,
  canSubmit = true,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title?: string
  description?: ReactNode
  pending: boolean
  onSubmit: (v: AddAccountValues) => void
  extra?: ReactNode
  canSubmit?: boolean
}) {
  const [v, setV] = useState<AddAccountValues>({ platform: 'reddit', url: '', createdOn: '', karma: '' })
  const reddit = v.platform === 'reddit'
  const valid = v.url.trim().length > 1 && (!reddit || (v.createdOn && v.karma !== ''))
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setV({ platform: 'reddit', url: '', createdOn: '', karma: '' })
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) onSubmit(v)
          }}
        >
          {extra}
          <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={v.platform} onValueChange={(p) => setV({ ...v, platform: p as AccountPlatform })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {ACCOUNT_PLATFORM_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-url">Profile link</Label>
              <Input
                id="acc-url"
                inputMode="url"
                autoCapitalize="none"
                placeholder={PLACEHOLDERS[v.platform]}
                value={v.url}
                onChange={(e) => setV({ ...v, url: e.target.value })}
              />
            </div>
          </div>
          {reddit ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="acc-created">Created on</Label>
                <Input id="acc-created" type="date" max={istDayKey(new Date())} value={v.createdOn} onChange={(e) => setV({ ...v, createdOn: e.target.value })} />
                <p className="text-xs text-muted-foreground">The “Cake day” on the profile.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-karma">Karma</Label>
                <Input
                  id="acc-karma"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={v.karma}
                  onChange={(e) => setV({ ...v, karma: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Post + comment karma.</p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || pending || !canSubmit}>
              {pending ? <Spinner /> : null}
              Add account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
