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
    <section className="space-y-4 border-t py-6 first:border-t-0 first:pt-0">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function SwitchRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="space-y-0.5">
        <FormLabel>{label}</FormLabel>
        {description ? <FormDescription>{description}</FormDescription> : null}
      </div>
      <FormControl>
        <Switch checked={checked} onCheckedChange={onChange} />
      </FormControl>
    </FormItem>
  )
}

const ALERT_OPTIONS = [
  { value: 'immediate', label: 'Every submission', hint: '' },
  { value: 'digest', label: 'Daily digest', hint: '' },
  { value: 'off', label: 'Off', hint: '' },
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
  const num = (name: 'reminderHoursBefore' | 'defaultClaimWindowHours' | 'defaultLiveHoldHours', label: string, description: string | null, suffix: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex items-center gap-2">
            <FormControl>
              <Input type="number" inputMode="numeric" min={0} className="w-24 tabular" {...field} value={field.value as never} />
            </FormControl>
            <span className="whitespace-nowrap text-sm text-muted-foreground">{suffix}</span>
          </div>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate className="rounded-xl border bg-card p-4 sm:p-6">
        <Group title="Admin alerts">
          <FormField
            control={form.control}
            name="alertEmails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Extra alert emails</FormLabel>
                <FormControl>
                  <EmailChipsInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="submissionAlerts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Submission emails</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-3">
                    {ALERT_OPTIONS.map((o) => (
                      <label
                        key={o.value}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/[0.04]"
                      >
                        <RadioGroupItem value={o.value} />
                        <span className="text-sm font-medium">{o.label}</span>
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
              <SwitchRow label="Email me about new applicants" checked={field.value} onChange={field.onChange} />
            )}
          />
          <FormField
            control={form.control}
            name="dailyDigest"
            render={({ field }) => (
              <SwitchRow
                label="Morning summary email"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Group>
        <Group title="Reminders">
          {num('reminderHoursBefore', 'Remind workers before deadline', '0 = no reminders', 'hours before')}
        </Group>
        <Group title="New gig defaults">
          <div className="grid items-start gap-5 sm:grid-cols-2">
            {num('defaultClaimWindowHours', 'Time to submit', null, 'hours')}
            {num('defaultLiveHoldHours', 'Keep live for', '0 = no live check', 'hours')}
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
