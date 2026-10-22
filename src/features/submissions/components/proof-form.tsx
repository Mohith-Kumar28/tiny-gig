import { zodResolver } from '@hookform/resolvers/zod'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useAction } from '@/hooks/use-action'
import { type ProofInput, proofSchema } from '../schemas'
import { submitProof } from '../server/worker-submissions'
import { ScreenshotUploader } from './screenshot-uploader'

const PROOF_HINTS: Record<string, string> = {
  reddit: 'Open your post or comment on Reddit, tap Share → Copy link, and paste it here.',
  x: 'Open your post on X, tap Share → Copy link, and paste it here.',
  linkedin: 'Open your post on LinkedIn, tap ⋯ → Copy link to post, and paste it here.',
  threads: 'Open your post on Threads, tap Share → Copy link, and paste it here.',
  instagram: 'Open your post on Instagram, tap ⋯ → Link, and paste it here.',
}

export function ProofForm({
  submissionId,
  platform,
  resubmit,
  defaults,
  disabled,
  twoStep = false,
}: {
  submissionId: string
  platform: string
  resubmit: boolean
  twoStep?: boolean
  defaults: { proofUrl?: string | null; screenshotKeys?: string[]; workerNote?: string | null }
  disabled?: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const form = useForm<ProofInput>({
    resolver: zodResolver(proofSchema),
    defaultValues: {
      submissionId,
      proofUrl: defaults.proofUrl ?? '',
      screenshotKeys: defaults.screenshotKeys ?? [],
      workerNote: resubmit ? '' : (defaults.workerNote ?? ''),
    },
  })
  const submit = useAction((data: ProofInput) => submitProof({ data }), {
    success: (r) => {
      if (r.warning) toast.warning(r.warning)
      if (r.status === 'on_hold') return 'Link submitted. Keep the post live, then upload the insights screenshot.'
      return resubmit ? 'Resubmitted! We will review your changes soon.' : 'Proof submitted! We will review it soon.'
    },
    invalidate: [['w']],
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="proofUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link to your post or comment</FormLabel>
              <FormControl>
                <Input
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="https://www.reddit.com/r/…/comments/…"
                  className="h-11"
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormDescription>{PROOF_HINTS[platform] ?? 'Paste the full link to your post or comment.'}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="screenshotKeys"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Screenshots (optional)</FormLabel>
              <ScreenshotUploader
                value={field.value}
                onChange={field.onChange}
                onUploadingChange={setUploading}
                disabled={disabled}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="workerNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{resubmit ? 'What did you change? (optional)' : 'Note for the reviewer (optional)'}</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  maxLength={1000}
                  disabled={disabled}
                  placeholder={resubmit ? 'e.g. I edited the title as asked.' : ''}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={disabled || uploading || submit.isPending}>
          {submit.isPending ? <Spinner /> : <Send />}
          {uploading ? 'Waiting for uploads…' : twoStep ? (resubmit ? 'Resubmit link' : 'Submit link') : resubmit ? 'Resubmit for review' : 'Submit for review'}
        </Button>
      </form>
    </Form>
  )
}
