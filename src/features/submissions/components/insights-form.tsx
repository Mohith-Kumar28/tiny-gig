import { zodResolver } from '@hookform/resolvers/zod'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAction } from '@/hooks/use-action'
import { type InsightsInput, insightsSchema } from '../schemas'
import { submitInsights } from '../server/worker-submissions'
import { ScreenshotUploader } from './screenshot-uploader'

/** Step two (R32–R34): the insights screenshot, a karma refresh, and confirming replies. */
export function InsightsForm({ submissionId, accountLabel }: { submissionId: string; accountLabel?: string }) {
  const [uploading, setUploading] = useState(false)
  const form = useForm<InsightsInput>({
    resolver: zodResolver(insightsSchema) as never,
    defaultValues: { submissionId, insightsKeys: [], workerNote: '', repliedToComments: false as never },
  })
  const submit = useAction((data: InsightsInput) => submitInsights({ data }), {
    success: 'Insights sent. We’ll review and credit your balance.',
    invalidate: [['w']],
  })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="insightsKeys"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Screenshot of the post’s insights</FormLabel>
              <FormDescription>Open your post on Reddit: the insights (views, upvote rate) show right under it. Screenshot that.</FormDescription>
              <ScreenshotUploader value={field.value} onChange={field.onChange} onUploadingChange={setUploading} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="karma"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your current karma{accountLabel ? ` on ${accountLabel}` : ''} (optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="h-11 max-w-48"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>Keeps your account’s record fresh. Takes a second while you’re on your profile.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="repliedToComments"
          render={({ field }) => (
            <FormItem className="rounded-lg border p-3">
              <div className="flex items-start gap-2.5">
                <FormControl>
                  <Checkbox checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                </FormControl>
                <FormLabel className="leading-snug font-normal">I’ve replied to the comments on my post (part of the task, not paid separately).</FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={uploading || submit.isPending}>
          {submit.isPending ? <Spinner /> : <Send />}
          {uploading ? 'Waiting for uploads…' : 'Send insights'}
        </Button>
      </form>
    </Form>
  )
}
