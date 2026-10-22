import { ImagePlus, Loader2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { ALLOWED_UPLOAD_TYPES, MAX_SCREENSHOTS, MAX_UPLOAD_BYTES } from '../schemas'

type Pending = { id: string; name: string; preview: string; progress: number }

function uploadFile(file: File, onProgress: (pct: number) => void, forUser?: string) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/uploads/')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let body: { key?: string; error?: string } = {}
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        // non-JSON error
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.key) resolve(body.key)
      else reject(new Error(body.error ?? 'Upload failed. Please try again.'))
    }
    xhr.onerror = () => reject(new Error('Network error while uploading. Check your connection.'))
    const form = new FormData()
    form.append('file', file)
    if (forUser) form.append('forUser', forUser)
    xhr.send(form)
  })
}

/** Proof screenshots: uploads to R2 immediately, returns object keys. */
export function ScreenshotUploader({
  value,
  onChange,
  onUploadingChange,
  disabled,
  forUser,
}: {
  value: string[]
  onChange: (keys: string[]) => void
  onUploadingChange?: (uploading: boolean) => void
  disabled?: boolean
  /** Staff only: store under this worker's prefix. */
  forUser?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending[]>([])
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    onUploadingChange?.(pending.length > 0)
  }, [pending.length, onUploadingChange])

  const remaining = MAX_SCREENSHOTS - value.length - pending.length

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    const list = Array.from(files)
    if (list.length > remaining) toast.error(`You can add up to ${MAX_SCREENSHOTS} screenshots.`)
    for (const file of list.slice(0, Math.max(0, remaining))) {
      if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
        toast.error(`${file.name}: only PNG, JPG, WEBP or GIF images.`)
        continue
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${file.name}: max size is 5 MB.`)
        continue
      }
      const id = crypto.randomUUID()
      const preview = URL.createObjectURL(file)
      setPending((p) => [...p, { id, name: file.name, preview, progress: 0 }])
      uploadFile(file, (pct) => setPending((p) => p.map((x) => (x.id === id ? { ...x, progress: pct } : x))), forUser)
        .then((key) => {
          // Update the ref eagerly so parallel uploads finishing together don't drop keys.
          valueRef.current = [...valueRef.current, key]
          onChange(valueRef.current)
        })
        .catch((err: Error) => toast.error(err.message))
        .finally(() => {
          URL.revokeObjectURL(preview)
          setPending((p) => p.filter((x) => x.id !== id))
        })
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {value.map((key, i) => (
          <div key={key} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
            <a href={`/api/uploads/${key}`} target="_blank" rel="noreferrer">
              <img src={`/api/uploads/${key}`} alt={`Screenshot ${i + 1}`} className="size-full object-cover" loading="lazy" />
            </a>
            {!disabled ? (
              <button
                type="button"
                onClick={() => onChange(value.filter((k) => k !== key))}
                className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border transition hover:bg-destructive hover:text-white"
                aria-label={`Remove screenshot ${i + 1}`}
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        ))}
        {pending.map((p) => (
          <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
            <img src={p.preview} alt="" className="size-full object-cover opacity-50" />
            <div className="absolute inset-x-1.5 bottom-1.5 space-y-1">
              <Loader2 className="mx-auto size-4 animate-spin text-foreground" />
              <Progress value={p.progress} className="h-1 bg-background/70" />
            </div>
          </div>
        ))}
        {remaining > 0 && !disabled ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary',
            )}
          >
            <ImagePlus className="size-5" />
            <span className="text-xs font-medium">Add</span>
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_UPLOAD_TYPES.join(',')}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => addFiles(e.target.files)}
      />
      <p className="text-xs text-muted-foreground">
        Up to {MAX_SCREENSHOTS} images, 5 MB each. {value.length ? `${value.length} added.` : ''}
      </p>
    </div>
  )
}
