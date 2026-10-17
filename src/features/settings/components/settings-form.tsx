import { zodResolver } from '@hookform/resolvers/zod'
import { Save, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { useAction } from '@/hooks/use-action'
import { cn } from '@/lib/utils'
import { type AppSettings, type AppSettingsInput, settingsSchema } from '../schemas'
import { saveSettings } from '../server/settings'

const email = z.email()

/** Type an address and press Enter / comma / space to add it as a chip. */
function EmailChipsInput({ value, onChange, id }: { value: string[]; onChange: (v: string[]) => void; id?: string }) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const commit = (raw = draft) => {
    const parts = raw
      .split(/[\s,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    if (!parts.length) return true
    const bad = parts.filter((p) => !email.safeParse(p).success)
    if (bad.length) {
      setError(`Not a valid email: ${bad.join(', ')}`)
      return false
    }
    const next = [...new Set([...value, ...parts])].slice(0, 20)
    onChange(next)
    setDraft('')
    setError(null)
    return true
  }
  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-2 py-1.5 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30',
          error && 'border-destructive',
        )}
      >
        {value.map((e) => (
          <span key={e} className="inline-flex h-6 items-center gap-1 rounded-md bg-secondary pr-1 pl-2 text-xs">
            {e}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== e))}
              className="rounded-sm opacity-60 hover:opacity-100"
              aria-label={`Remove ${e}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',' || (e.key === ' ' && draft.trim())) {
              e.preventDefault()
              commit()
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => commit()}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text')
            if (/[\s,;]/.test(text)) {
              e.preventDefault()
              commit(text)
            }
          }}
          placeholder={value.length ? 'Add another…' : 'ops@company.com'}
          className="min-w-40 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          type="email"
          inputMode="email"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function Group({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-x-8 gap-y-4 border-t py-6 first:border-t-0 first:pt-0 md:grid-cols-[220px_1fr]">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function SwitchRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <FormItem className="flex items-start justify-between gap-4 rounded-lg border p-3">
      <div className="space-y-0.5">
        <FormLabel>{label}</FormLabel>
        <FormDescription>{description}</FormDescription>
      </div>
      <FormControl>
        <Switch checked={checked} onCheckedChange={onChange} />
      </FormControl>
    </FormItem>
  )
}

const ALERT_OPTIONS = [
  { value: 'immediate', label: 'Immediately', hint: 'One email per new submission' },
  { value: 'digest', label: 'Digest', hint: 'Batched summary of new submissions' },
  { value: 'off', label: 'Off', hint: 'Check the review inbox yourself' },
] as const

export function SettingsForm({ initial }: { initial: AppSettings }) {
  const form = useForm<AppSettingsInput, unknown, AppSettings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initial,
  })
  const save = useAction((v: AppSettings) => saveSettings({ data: v }), {
    success: 'Settings saved',
    invalidate: [['admin', 'settings']],
    onSuccess: (r) => form.reset(r),
  })
  const num = (name: 'reminderHoursBefore' | 'defaultClaimWindowHours' | 'defaultLiveHoldHours', label: string, description: string, suffix: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex max-w-48 items-center gap-2">
            <FormControl>
              <Input type="number" inputMode="numeric" min={0} className="tabular" {...field} value={field.value as never} />
            </FormControl>
            <span className="text-sm text-muted-foreground">{suffix}</span>
          </div>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="rounded-xl border bg-card p-4 sm:p-6">
        <Group title="Admin alerts" description="Who gets notified, and how often. Admin emails from the environment always get alerts.">
          <FormField
            control={form.control}
            name="alertEmails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Extra alert emails</FormLabel>
                <FormControl>
                  <EmailChipsInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormDescription>Press Enter or comma to add. Up to 20.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="submissionAlerts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New submission alerts</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-3">
                    {ALERT_OPTIONS.map((o) => (
                      <label
                        key={o.value}
                        className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/[0.04]"
                      >
                        <RadioGroupItem value={o.value} className="mt-0.5" />
                        <span className="space-y-0.5">
                          <span className="block text-sm font-medium">{o.label}</span>
                          <span className="block text-xs text-muted-foreground">{o.hint}</span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="applicantAlerts"
            render={({ field }) => (
              <SwitchRow label="New applicant alerts" description="Email when someone applies to become a worker." checked={field.value} onChange={field.onChange} />
            )}
          />
          <FormField
            control={form.control}
            name="dailyDigest"
            render={({ field }) => (
              <SwitchRow
                label="Daily digest"
                description="A morning summary: reviews waiting, live checks due, unpaid balance."
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Group>
        <Group title="Worker reminders">
          {num('reminderHoursBefore', 'Deadline reminder', 'Email workers this long before a claimed task expires. 0 turns reminders off.', 'hours before')}
        </Group>
        <Group title="New gig defaults" description="Pre-filled on the new gig form. Each gig can override them.">
          <div className="grid gap-5 sm:grid-cols-2">
            {num('defaultClaimWindowHours', 'Claim window', 'Time to submit proof after claiming.', 'hours')}
            {num('defaultLiveHoldHours', 'Live hold', '0 = approve immediately.', 'hours')}
          </div>
        </Group>
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          {form.formState.isDirty ? <span className="mr-auto text-xs text-muted-foreground">Unsaved changes</span> : null}
          <Button type="button" variant="ghost" disabled={!form.formState.isDirty || save.isPending} onClick={() => form.reset(initial)}>
            Discard
          </Button>
          <Button type="submit" disabled={save.isPending || !form.formState.isDirty}>
            {save.isPending ? <Spinner /> : <Save />}
            Save settings
          </Button>
        </div>
      </form>
    </Form>
  )
}
