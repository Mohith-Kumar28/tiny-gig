import {
  Check,
  ChevronsUpDown,
  CirclePlay,
  Copy,
  Download,
  ExternalLink,
  ImageIcon,
  Link2,
  ListTodo,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  EMPTY_BODY,
  MAX_MEDIA,
  mediaUrl,
  normalizeCommunity,
  type PostKind,
  type PostMedia,
  type RedditPost,
  TITLE_MAX,
  toMarkdown,
} from '../post'
import { POST_MEDIA_ACCEPT, uploadPostMedia } from '../upload'
import { BodyEditor, rdButton } from './body-editor'

export type ComposerAction = {
  label: ReactNode
  onClick?: () => void
  /** Renders a link that opens in a new tab instead of a button. */
  href?: string
  disabled?: boolean
  pending?: boolean
}

const TABS: { kind: PostKind | 'poll'; label: string }[] = [
  { kind: 'text', label: 'Text' },
  { kind: 'media', label: 'Images & Video' },
  { kind: 'link', label: 'Link' },
  { kind: 'poll', label: 'Poll' },
]

function useIsPhone() {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    const on = () => setPhone(mql.matches)
    on()
    mql.addEventListener('change', on)
    return () => mql.removeEventListener('change', on)
  }, [])
  return phone
}

async function copyText(text: string, what: string) {
  await navigator.clipboard.writeText(text)
  toast.success(`${what} copied`)
}

function CopyChip({ value, what, label = 'Copy', className }: { value: string; what: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      aria-label={`Copy ${what.toLowerCase()}`}
      title={`Copy ${what.toLowerCase()}`}
      disabled={!value}
      onClick={async (e) => {
        e.stopPropagation()
        await copyText(value, what)
        setDone(true)
        setTimeout(() => setDone(false), 1500)
      }}
      className={cn(
        'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[var(--rd-chip)] px-3 text-xs font-semibold text-[var(--rd-chip-fg)] hover:bg-[var(--rd-hover)] disabled:opacity-40 [&_svg]:size-3.5',
        className,
      )}
    >
      {done ? <Check /> : <Copy />} {done ? 'Copied' : label}
    </button>
  )
}

function ActionButton({
  action,
  variant,
  className,
}: {
  action: ComposerAction
  variant: 'primary' | 'secondary'
  className?: string
}) {
  const body = (
    <>
      {action.pending ? <Loader2 className="animate-spin" /> : null}
      {action.label}
    </>
  )
  if (action.href) {
    return (
      <a
        href={action.href}
        target="_blank"
        rel="noreferrer noopener"
        aria-disabled={action.disabled || undefined}
        className={rdButton(variant, className)}
      >
        {body}
      </a>
    )
  }
  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled || action.pending}
      className={rdButton(variant, className)}
    >
      {body}
    </button>
  )
}

function SubredditIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-full bg-[#ff4500] text-[11px] font-bold text-white',
        className,
      )}
    >
      r/
    </span>
  )
}

function CommunityPicker({ value, onChange, compact }: { value: string; onChange?: (v: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const label = value ? `r/${value}` : compact ? 'Select a community' : 'Select Community'
  const pill = cn(
    'inline-flex h-12 min-w-0 cursor-pointer items-center gap-2 rounded-full border border-[var(--rd-border)] px-4 text-[15px] font-semibold text-[var(--rd-fg)] hover:bg-[var(--rd-hover)] [&>svg]:size-5',
    compact && 'h-11 px-3.5 text-sm',
  )
  if (!onChange) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <a
          href={value ? `https://www.reddit.com/r/${value}/` : undefined}
          target="_blank"
          rel="noreferrer noopener"
          className={pill}
        >
          {value ? <SubredditIcon /> : null}
          <span className="truncate">{label}</span>
          {value ? <ExternalLink className="!size-4 text-[var(--rd-muted)]" /> : null}
        </a>
        {value && !compact ? <CopyChip value={`r/${value}`} what="Community" /> : null}
      </div>
    )
  }
  const commit = () => {
    onChange(normalizeCommunity(draft))
    setOpen(false)
  }
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setDraft(value)
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className={pill}>
          {value ? <SubredditIcon /> : null}
          <span className="truncate">{label}</span>
          <ChevronsUpDown />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="reddit-ui w-80 space-y-2 rounded-2xl border-[var(--rd-border-weak)] p-3">
        <input
          // biome-ignore lint/a11y/noAutofocus: the popover exists only to type this
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
          }}
          placeholder="Subreddit name or URL"
          className="h-11 w-full rounded-full border border-[var(--rd-border)] bg-transparent px-4 text-sm text-[var(--rd-fg)] outline-none placeholder:text-[var(--rd-placeholder)] focus:border-[var(--rd-fg)]"
        />
        {normalizeCommunity(draft) ? (
          <button
            type="button"
            onClick={commit}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm font-semibold text-[var(--rd-fg)] hover:bg-[var(--rd-hover)]"
          >
            <SubredditIcon className="size-8 text-xs" /> r/{normalizeCommunity(draft)}
          </button>
        ) : (
          <p className="px-2 text-xs text-[var(--rd-muted)]">Type a name like developersindia, or paste a reddit.com/r/… link.</p>
        )}
      </PopoverContent>
    </Popover>
  )
}

function Tabs({ kind, onChange }: { kind: PostKind; onChange?: (k: PostKind) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
      {TABS.map((t) => {
        const active = t.kind === kind
        const disabled = t.kind === 'poll' || (!onChange && !active)
        return (
          <button
            key={t.kind}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => t.kind !== 'poll' && onChange?.(t.kind)}
            className={cn(
              'relative shrink-0 cursor-pointer rounded-full px-4 pt-2 pb-4 text-[15px] font-semibold text-[var(--rd-fg)] hover:bg-[var(--rd-hover)] disabled:cursor-default disabled:text-[var(--rd-disabled-fg)] disabled:hover:bg-transparent',
              active && 'disabled:text-[var(--rd-fg)]',
            )}
          >
            {t.label}
            {active ? <span aria-hidden className="absolute inset-x-4 bottom-1 h-1 rounded-full bg-[var(--rd-tab)]" /> : null}
          </button>
        )
      })}
    </div>
  )
}

function AutoTextarea({ className, value, ...props }: React.ComponentProps<'textarea'> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: the height follows the text
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      {...props}
      className={cn('block w-full resize-none overflow-hidden bg-transparent outline-none', className)}
    />
  )
}

/** Reddit's outlined field with a label that floats up once there's text or focus. */
function FloatingField({
  label,
  value,
  onChange,
  max,
  readOnlyAction,
  multiline,
  inputMode,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  max?: number
  readOnlyAction?: ReactNode
  multiline?: boolean
  inputMode?: 'url'
}) {
  const [focus, setFocus] = useState(false)
  const up = focus || !!value
  const id = useId()
  return (
    <div>
      <div
        className={cn(
          'relative flex min-h-14 items-center gap-2 rounded-[20px] border border-[var(--rd-border)] px-4 pt-5 pb-2',
          focus && 'border-[var(--rd-fg)]',
        )}
      >
        <label
          htmlFor={id}
          className={cn(
            'pointer-events-none absolute left-4 text-[var(--rd-placeholder)] transition-all',
            up ? 'top-1.5 text-xs' : 'top-1/2 -translate-y-1/2 text-base',
          )}
        >
          {label}
          <span className="text-[var(--rd-danger)]">*</span>
        </label>
        {multiline ? (
          <AutoTextarea
            id={id}
            value={value}
            readOnly={!onChange}
            maxLength={max}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            onChange={(e) => onChange?.(e.target.value.replace(/\n/g, ' '))}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            className="min-w-0 flex-1 text-base text-[var(--rd-fg)]"
          />
        ) : (
          <input
            id={id}
            value={value}
            readOnly={!onChange}
            inputMode={inputMode}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            onChange={(e) => onChange?.(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-base text-[var(--rd-fg)] outline-none"
          />
        )}
        {readOnlyAction}
      </div>
      {max ? (
        <p className="mt-1 pr-4 text-right text-xs text-[var(--rd-muted)] tabular-nums">
          {value.length}/{max}
        </p>
      ) : null}
    </div>
  )
}

function TagsRow({ value, onChange }: { value: RedditPost; onChange?: (p: Partial<RedditPost>) => void }) {
  const chips = [
    value.nsfw && { key: 'nsfw', label: 'NSFW', className: 'bg-[#ff4500] text-white' },
    value.spoiler && { key: 'spoiler', label: 'Spoiler', className: 'bg-[var(--rd-chip)]' },
    value.brand && { key: 'brand', label: 'Brand affiliate', className: 'bg-[var(--rd-chip)]' },
    value.flair && { key: 'flair', label: `Flair: ${value.flair}`, className: 'bg-[var(--rd-tab)]/20' },
  ].filter(Boolean) as { key: string; label: string; className: string }[]
  if (!onChange && !chips.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span
          key={c.key}
          className={cn('inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold text-[var(--rd-fg)]', c.className)}
        >
          {c.label}
        </span>
      ))}
      {onChange ? <TagsPopover value={value} onChange={onChange} hasTags={chips.length > 0} /> : null}
    </div>
  )
}

function TagsPopover({
  value,
  onChange,
  hasTags,
}: {
  value: RedditPost
  onChange: (p: Partial<RedditPost>) => void
  hasTags: boolean
}) {
  const toggle = (key: 'nsfw' | 'spoiler' | 'brand', label: string, hint: string) => (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-[var(--rd-hover)]">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-[var(--rd-muted)]">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={value[key]}
        onChange={(e) => onChange({ [key]: e.target.checked })}
        className="size-5 accent-[var(--rd-primary)]"
      />
    </label>
  )
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 cursor-pointer items-center rounded-full bg-[var(--rd-chip)] px-3 text-xs font-semibold text-[var(--rd-chip-fg)] hover:bg-[var(--rd-hover)]"
        >
          {hasTags ? 'Edit tags' : 'Add tags'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="reddit-ui w-80 space-y-1 rounded-2xl border-[var(--rd-border-weak)] p-2">
        <p className="px-2 pt-1 pb-2 text-base font-bold">Add tags</p>
        {toggle('nsfw', 'Not Safe For Work', 'Mature or explicit content')}
        {toggle('spoiler', 'Spoiler', 'Could ruin the surprise')}
        {toggle('brand', 'Brand affiliate', 'Made for a brand or business')}
        <div className="px-2 pt-2 pb-1">
          <input
            value={value.flair}
            maxLength={64}
            onChange={(e) => onChange({ flair: e.target.value })}
            placeholder="Flair (if the community needs one)"
            className="h-10 w-full rounded-full border border-[var(--rd-border)] bg-transparent px-4 text-sm outline-none placeholder:text-[var(--rd-placeholder)] focus:border-[var(--rd-fg)]"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function downloadHref(m: PostMedia) {
  return `${mediaUrl(m.key)}?download=${encodeURIComponent(m.name || m.key.split('/').pop() || 'media')}`
}

function MediaField({
  media,
  onChange,
  compact,
}: {
  media: PostMedia[]
  onChange?: (m: PostMedia[]) => void
  compact?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [progress, setProgress] = useState<{ name: string; pct: number }[]>([])
  const latest = useRef(media)
  latest.current = media

  const upload = async (files: File[]) => {
    if (!onChange) return
    const room = MAX_MEDIA - latest.current.length
    if (room <= 0) return toast.error(`Up to ${MAX_MEDIA} files per post.`)
    for (const file of files.slice(0, room)) {
      setProgress((p) => [...p, { name: file.name, pct: 0 }])
      try {
        const m = await uploadPostMedia(file, (pct) =>
          setProgress((p) => p.map((x) => (x.name === file.name ? { ...x, pct } : x))),
        )
        onChange([...latest.current, m])
      } catch (err) {
        toast.error(`${file.name}: ${(err as Error).message}`)
      } finally {
        setProgress((p) => p.filter((x) => x.name !== file.name))
      }
    }
  }
  const downloadAll = () => {
    for (const m of media) {
      const a = document.createElement('a')
      a.href = downloadHref(m)
      a.download = m.name
      a.click()
    }
  }

  const tiles = media.map((m, i) => (
    <div
      key={m.key}
      className="group relative aspect-square overflow-hidden rounded-2xl border border-[var(--rd-border-weak)] bg-black"
    >
      {m.type === 'video' ? (
        // biome-ignore lint/a11y/useMediaCaption: the client's own clip; no captions exist
        <video src={mediaUrl(m.key)} controls={!onChange} preload="metadata" playsInline className="size-full object-contain" />
      ) : (
        <img src={mediaUrl(m.key)} alt={m.name} className="size-full object-cover" loading="lazy" />
      )}
      <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
        {i + 1}
        {m.type === 'video' ? ' · video' : ''}
      </span>
      {onChange ? (
        <button
          type="button"
          aria-label={`Remove ${m.name}`}
          onClick={() => onChange(media.filter((x) => x.key !== m.key))}
          className="absolute top-2 right-2 grid size-7 cursor-pointer place-items-center rounded-full bg-black/70 text-white hover:bg-black"
        >
          <X className="size-4" />
        </button>
      ) : (
        <a
          href={downloadHref(m)}
          download={m.name}
          aria-label={`Download ${m.name}`}
          className="absolute right-2 bottom-2 inline-flex h-8 items-center gap-1 rounded-full bg-black/75 px-3 text-xs font-semibold text-white hover:bg-black"
        >
          <Download className="size-3.5" /> Download
        </a>
      )}
    </div>
  ))

  if (!onChange) {
    if (!media.length) return <p className="text-sm text-[var(--rd-muted)]">No media attached.</p>
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--rd-muted)]">Upload these in this order.</p>
          {media.length > 1 ? (
            <button type="button" onClick={downloadAll} className={rdButton('secondary', 'h-8 px-3 text-xs')}>
              <Download /> Download all
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{tiles}</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {media.length || progress.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {tiles}
          {progress.map((p) => (
            <div
              key={p.name}
              className="grid aspect-square place-items-center rounded-2xl border border-dashed border-[var(--rd-border)] text-xs text-[var(--rd-muted)]"
            >
              <span className="flex flex-col items-center gap-1">
                <Loader2 className="size-5 animate-spin" /> {p.pct}%
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          void upload([...e.dataTransfer.files])
        }}
        className={cn(
          'flex w-full cursor-pointer items-center justify-center gap-3 rounded-[20px] border border-dashed border-[var(--rd-border)] text-[15px] text-[var(--rd-fg)] hover:bg-[var(--rd-hover)]',
          compact ? 'h-24' : 'h-40',
          drag && 'border-[var(--rd-tab)] bg-[var(--rd-hover)]',
        )}
      >
        Drag and Drop or upload media
        <span className="grid size-10 place-items-center rounded-full bg-[var(--rd-chip)]">
          <Upload className="size-5" />
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        hidden
        multiple
        accept={POST_MEDIA_ACCEPT}
        onChange={(e) => {
          void upload([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
    </div>
  )
}

/** The body as Markdown for Reddit's Markdown mode, and as rich HTML for its fancy-pants editor. */
function BodyCopyBar({ html, markdown }: { html: () => string; markdown: string }) {
  const copyRich = async () => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html()], { type: 'text/html' }),
          'text/plain': new Blob([markdown], { type: 'text/plain' }),
        }),
      ])
      toast.success('Body copied with formatting')
    } catch {
      await copyText(markdown, 'Body')
    }
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rd-border-weak)] px-4 py-2">
      <span className="text-xs font-semibold text-[var(--rd-muted)]">Body text</span>
      <span className="flex gap-1.5">
        <button type="button" onClick={copyRich} disabled={!markdown} className={rdButton('secondary', 'h-8 px-3 text-xs')}>
          <Copy /> Copy
        </button>
        <CopyChip value={markdown} what="Markdown" label="Copy Markdown" />
      </span>
    </div>
  )
}

function stripMedia(html: string) {
  return html.replace(/<img[^>]*>/g, '').replace(/<video[^>]*>(<\/video>)?/g, '')
}

/**
 * A copy of Reddit's "Create post" screen, desktop and app layouts. Pass `onChange` to edit (staff);
 * leave it out and every field is read-only, with copy and download buttons (workers).
 */
export function RedditComposer({
  value,
  onChange,
  primary,
  secondary,
  onClose,
  heading = 'Create post',
}: {
  value: RedditPost
  onChange?: (p: RedditPost) => void
  primary?: ComposerAction
  secondary?: ComposerAction
  onClose?: () => void
  heading?: string
}) {
  const phone = useIsPhone()
  const readOnly = !onChange
  const set = (patch: Partial<RedditPost>) => onChange?.({ ...value, ...patch })
  const [editor, setEditor] = useState<{ getHTML: () => string } | null>(null)
  const markdown = readOnly ? toMarkdown(value.body) : ''

  const body = (bare: boolean) => (
    <BodyEditor
      key={`${readOnly}`}
      value={value.body ?? (readOnly ? null : EMPTY_BODY)}
      onChange={onChange ? (doc) => set({ body: doc }) : undefined}
      placeholder={bare ? 'body text (optional)' : 'Body text (optional)'}
      bare={bare && !readOnly}
      onEditor={setEditor}
      header={readOnly ? <BodyCopyBar html={() => stripMedia(editor?.getHTML() ?? '')} markdown={markdown} /> : null}
    />
  )
  const showBody = !readOnly || !!markdown || value.body?.content?.some((n) => n.type === 'image' || n.type === 'redditVideo')
  const titleCopy = readOnly ? <CopyChip value={value.title} what="Title" /> : null
  const urlActions = readOnly ? (
    <span className="flex gap-1.5">
      <CopyChip value={value.url} what="Link" />
      {value.url ? (
        <a
          href={value.url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Open link"
          className={rdButton('secondary', 'size-8 p-0')}
        >
          <ExternalLink />
        </a>
      ) : null}
    </span>
  ) : null

  if (phone) {
    const pickKind = (k: PostKind) => set({ kind: value.kind === k ? 'text' : k })
    return (
      <div className="reddit-ui flex min-h-full flex-col">
        <div className="flex items-center gap-2 px-3 py-2.5">
          {onClose ? (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-[var(--rd-border)] hover:bg-[var(--rd-hover)]"
            >
              <X className="size-6" />
            </button>
          ) : null}
          <CommunityPicker value={value.community} onChange={onChange ? (c) => set({ community: c }) : undefined} compact />
          <span className="flex-1" />
          {readOnly && value.community ? <CopyChip value={`r/${value.community}`} what="Community" /> : null}
          {primary && !readOnly ? <ActionButton action={primary} variant="primary" className="h-11 px-5" /> : null}
        </div>
        <div className="flex-1 space-y-4 px-4 pt-2 pb-4">
          {readOnly ? (
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 text-2xl leading-tight font-bold break-words">
                {value.title || <span className="text-[var(--rd-placeholder)]">No title</span>}
              </p>
              {titleCopy}
            </div>
          ) : (
            <div>
              <AutoTextarea
                value={value.title}
                maxLength={TITLE_MAX}
                placeholder="Title"
                onChange={(e) => set({ title: e.target.value.replace(/\n/g, ' ') })}
                className="text-2xl leading-tight font-bold text-[var(--rd-fg)] placeholder:text-[var(--rd-placeholder)]"
              />
              {value.title ? (
                <p className="mt-1 text-right text-xs text-[var(--rd-muted)] tabular-nums">
                  {value.title.length}/{TITLE_MAX}
                </p>
              ) : null}
            </div>
          )}
          <TagsRow value={value} onChange={onChange ? set : undefined} />
          {value.kind === 'link' ? (
            <div className="relative">
              <FloatingField
                label="Link URL"
                value={value.url}
                onChange={onChange ? (url) => set({ url }) : undefined}
                inputMode="url"
                readOnlyAction={urlActions}
              />
              {!readOnly ? (
                <button
                  type="button"
                  aria-label="Remove link"
                  onClick={() => set({ kind: 'text' })}
                  className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-[var(--rd-chip)]"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
          {value.kind === 'media' ? (
            <MediaField media={value.media} onChange={onChange ? (media) => set({ media }) : undefined} compact />
          ) : null}
          {showBody ? body(true) : null}
        </div>
        {readOnly ? (
          primary || secondary ? (
            <div className="flex gap-2 border-t border-[var(--rd-border-weak)] px-4 py-3">
              {secondary ? <ActionButton action={secondary} variant="secondary" className="flex-1" /> : null}
              {primary ? <ActionButton action={primary} variant="primary" className="flex-[1.4]" /> : null}
            </div>
          ) : null
        ) : (
          <div className="sticky bottom-0 flex items-center gap-1 border-t border-[var(--rd-border-weak)] bg-[var(--rd-bg)] px-3 py-2 [&_button]:grid [&_button]:size-12 [&_button]:cursor-pointer [&_button]:place-items-center [&_button]:rounded-full [&_button:hover]:bg-[var(--rd-hover)] [&_svg]:size-6">
            <button
              type="button"
              aria-label="Add link"
              aria-pressed={value.kind === 'link'}
              onClick={() => pickKind('link')}
              className={cn(value.kind === 'link' && 'bg-[var(--rd-hover)]')}
            >
              <Link2 />
            </button>
            <button
              type="button"
              aria-label="Add images"
              aria-pressed={value.kind === 'media'}
              onClick={() => pickKind('media')}
              className={cn(value.kind === 'media' && 'bg-[var(--rd-hover)]')}
            >
              <ImageIcon />
            </button>
            <button type="button" aria-label="Add video" onClick={() => set({ kind: 'media' })}>
              <CirclePlay />
            </button>
            <button type="button" aria-label="Poll (not available)" disabled className="opacity-40">
              <ListTodo />
            </button>
            {secondary ? <ActionButton action={secondary} variant="secondary" className="ml-auto !size-auto !h-10 px-4" /> : null}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="reddit-ui space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-[var(--rd-heading)]">{heading}</h2>
        {onClose ? (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-[var(--rd-hover)]"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>
      <CommunityPicker value={value.community} onChange={onChange ? (c) => set({ community: c }) : undefined} />
      <Tabs kind={value.kind} onChange={onChange ? (kind) => set({ kind }) : undefined} />
      <FloatingField
        label="Title"
        value={value.title}
        onChange={onChange ? (title) => set({ title }) : undefined}
        max={TITLE_MAX}
        multiline
        readOnlyAction={titleCopy}
      />
      <TagsRow value={value} onChange={onChange ? set : undefined} />
      {value.kind === 'media' ? (
        <MediaField media={value.media} onChange={onChange ? (media) => set({ media }) : undefined} />
      ) : null}
      {value.kind === 'link' ? (
        <FloatingField
          label="Link URL"
          value={value.url}
          onChange={onChange ? (url) => set({ url }) : undefined}
          inputMode="url"
          readOnlyAction={urlActions}
        />
      ) : null}
      {showBody ? body(false) : null}
      {primary || secondary ? (
        <div className="flex justify-end gap-2">
          {secondary ? <ActionButton action={secondary} variant="secondary" /> : null}
          {primary ? <ActionButton action={primary} variant="primary" /> : null}
        </div>
      ) : null}
    </div>
  )
}
