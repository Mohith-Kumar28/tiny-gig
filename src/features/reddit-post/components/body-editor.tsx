import { Mark, mergeAttributes, Node } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import Superscript from '@tiptap/extension-superscript'
import { TableKit } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import { type Editor, EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  CirclePlay,
  Code,
  Ellipsis,
  Heading,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  OctagonAlert,
  Quote,
  SquareCode,
  Strikethrough,
  Superscript as SuperscriptIcon,
  Table,
} from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { mediaUrl, type PostNode } from '../post'
import { POST_MEDIA_ACCEPT, uploadPostMedia } from '../upload'

const Spoiler = Mark.create({
  name: 'spoiler',
  parseHTML: () => [{ tag: 'span[data-spoiler]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, { 'data-spoiler': '', class: 'rd-spoiler' }), 0],
})

const RedditVideo = Node.create({
  name: 'redditVideo',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes: () => ({ src: { default: null } }),
  parseHTML: () => [{ tag: 'video[src]' }],
  renderHTML: ({ HTMLAttributes }) => [
    'video',
    mergeAttributes(HTMLAttributes, { controls: 'true', preload: 'metadata', playsinline: 'true' }),
  ],
})

function extensions(placeholder: string) {
  return [
    StarterKit.configure({
      underline: false,
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https', protocols: ['http', 'https'] },
    }),
    Superscript,
    Spoiler,
    Image.configure({ inline: false }),
    RedditVideo,
    TableKit.configure({ table: { resizable: false } }),
    Placeholder.configure({ placeholder }),
  ]
}

function Tool({
  label,
  active,
  onPress,
  disabled,
  children,
}: {
  label: string
  active?: boolean
  onPress: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      className={cn(
        'grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--rd-fg)] transition-colors hover:bg-[var(--rd-hover)] disabled:cursor-default disabled:opacity-40 [&_svg]:size-[18px]',
        active && 'bg-[var(--rd-hover)]',
      )}
    >
      {children}
    </button>
  )
}

const Divider = () => <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-[var(--rd-border-weak)]" />

function LinkTool({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [href, setHref] = useState('')
  const apply = () => {
    const url = href.trim()
    const chain = editor.chain().focus().extendMarkRange('link')
    if (url) chain.setLink({ href: /^https?:\/\//i.test(url) ? url : `https://${url}` }).run()
    else chain.unsetLink().run()
    setOpen(false)
  }
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setHref(String(editor.getAttributes('link').href ?? ''))
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Link"
          title="Link"
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            'grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--rd-fg)] hover:bg-[var(--rd-hover)] [&_svg]:size-[18px]',
            editor.isActive('link') && 'bg-[var(--rd-hover)]',
          )}
        >
          <Link2 />
        </button>
      </PopoverTrigger>
      <PopoverContent className="reddit-ui w-72 space-y-2 rounded-2xl border-[var(--rd-border-weak)] p-3">
        <input
          // biome-ignore lint/a11y/noAutofocus: the popover exists only to type this
          autoFocus
          value={href}
          onChange={(e) => setHref(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              apply()
            }
          }}
          placeholder="Link"
          className="h-10 w-full rounded-full border border-[var(--rd-border)] bg-transparent px-4 text-sm text-[var(--rd-fg)] outline-none placeholder:text-[var(--rd-placeholder)] focus:border-[var(--rd-fg)]"
        />
        <div className="flex justify-end gap-2">
          {editor.isActive('link') ? (
            <RedditButton
              variant="secondary"
              onClick={() => {
                editor.chain().focus().extendMarkRange('link').unsetLink().run()
                setOpen(false)
              }}
            >
              Remove
            </RedditButton>
          ) : null}
          <RedditButton onClick={apply}>Save</RedditButton>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Reddit's pill buttons, for <button> and <a> alike. */
export function rdButton(variant: 'primary' | 'secondary' = 'primary', className?: string) {
  return cn(
    'inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-[var(--rd-disabled)] disabled:text-[var(--rd-disabled-fg)] aria-disabled:pointer-events-none aria-disabled:bg-[var(--rd-disabled)] aria-disabled:text-[var(--rd-disabled-fg)] [&_svg]:size-4',
    variant === 'primary'
      ? 'bg-[var(--rd-primary)] text-[var(--rd-primary-fg)] hover:bg-[var(--rd-primary-hover)]'
      : 'bg-[var(--rd-chip)] text-[var(--rd-chip-fg)] hover:bg-[var(--rd-hover)]',
    className,
  )
}

export function RedditButton({
  variant = 'primary',
  className,
  ...props
}: React.ComponentProps<'button'> & { variant?: 'primary' | 'secondary' }) {
  return <button type="button" {...props} className={rdButton(variant, className)} />
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<'image' | 'video' | null>(null)
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      strike: e.isActive('strike'),
      sup: e.isActive('superscript'),
      heading: e.isActive('heading'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      spoiler: e.isActive('spoiler'),
      quote: e.isActive('blockquote'),
      code: e.isActive('code'),
      codeBlock: e.isActive('codeBlock'),
      table: e.isActive('table'),
    }),
  })
  const pick = (kind: 'image' | 'video') => {
    if (!fileRef.current) return
    fileRef.current.accept =
      kind === 'image' ? 'image/png,image/jpeg,image/webp,image/gif' : 'video/mp4,video/webm,video/quicktime'
    fileRef.current.dataset.kind = kind
    fileRef.current.click()
  }
  const onFile = async (file: File | undefined) => {
    if (!file) return
    const kind = file.type.startsWith('video/') ? 'video' : 'image'
    setUploading(kind)
    try {
      const m = await uploadPostMedia(file)
      const src = mediaUrl(m.key)
      if (kind === 'image') editor.chain().focus().setImage({ src, alt: m.name }).run()
      else editor.chain().focus().insertContent({ type: 'redditVideo', attrs: { src } }).run()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(null)
    }
  }
  const c = () => editor.chain().focus()
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto px-2 pt-2 [scrollbar-width:none]">
      <Tool label="Bold" active={s.bold} onPress={() => c().toggleBold().run()}>
        <Bold strokeWidth={2.5} />
      </Tool>
      <Tool label="Italic" active={s.italic} onPress={() => c().toggleItalic().run()}>
        <Italic />
      </Tool>
      <Tool label="Strikethrough" active={s.strike} onPress={() => c().toggleStrike().run()}>
        <Strikethrough />
      </Tool>
      <Tool label="Superscript" active={s.sup} onPress={() => c().toggleSuperscript().run()}>
        <SuperscriptIcon />
      </Tool>
      <Tool label="Heading" active={s.heading} onPress={() => c().toggleHeading({ level: 1 }).run()}>
        <Heading />
      </Tool>
      <Divider />
      <LinkTool editor={editor} />
      <Tool label="Image" disabled={!!uploading} onPress={() => pick('image')}>
        <ImageIcon />
      </Tool>
      <Tool label="Video" disabled={!!uploading} onPress={() => pick('video')}>
        <CirclePlay />
      </Tool>
      <Tool label="Bulleted List" active={s.bullet} onPress={() => c().toggleBulletList().run()}>
        <List />
      </Tool>
      <Tool label="Number List" active={s.ordered} onPress={() => c().toggleOrderedList().run()}>
        <ListOrdered />
      </Tool>
      <Divider />
      <Tool label="Spoiler" active={s.spoiler} onPress={() => c().toggleMark('spoiler').run()}>
        <OctagonAlert />
      </Tool>
      <Tool label="Quote Block" active={s.quote} onPress={() => c().toggleBlockquote().run()}>
        <Quote />
      </Tool>
      <Tool label="Code" active={s.code} onPress={() => c().toggleCode().run()}>
        <Code />
      </Tool>
      <Tool label="Code Block" active={s.codeBlock} onPress={() => c().toggleCodeBlock().run()}>
        <SquareCode />
      </Tool>
      <Tool label="Table" active={s.table} onPress={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <Table />
      </Tool>
      <span className="ml-auto" />
      <MoreMenu editor={editor} inTable={s.table} />
      {uploading ? <span className="ml-1 shrink-0 text-xs text-[var(--rd-muted)]">Uploading {uploading}…</span> : null}
      <input
        ref={fileRef}
        type="file"
        hidden
        accept={POST_MEDIA_ACCEPT}
        onChange={(e) => {
          void onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}

function MoreMenu({ editor, inTable }: { editor: Editor; inTable: boolean }) {
  const [open, setOpen] = useState(false)
  const item = (label: string, run: () => void, disabled = false) => (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        run()
        setOpen(false)
      }}
      className="flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm text-[var(--rd-fg)] hover:bg-[var(--rd-hover)] disabled:cursor-default disabled:opacity-40"
    >
      {label}
    </button>
  )
  const c = () => editor.chain().focus()
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="More formatting"
          title="More"
          onMouseDown={(e) => e.preventDefault()}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--rd-fg)] hover:bg-[var(--rd-hover)] [&_svg]:size-[18px]"
        >
          <Ellipsis />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="reddit-ui w-56 rounded-2xl border-[var(--rd-border-weak)] p-1.5">
        {item('Heading 2', () => c().toggleHeading({ level: 2 }).run())}
        {item('Heading 3', () => c().toggleHeading({ level: 3 }).run())}
        {item('Divider line', () => c().setHorizontalRule().run())}
        {item('Add row below', () => c().addRowAfter().run(), !inTable)}
        {item('Add column right', () => c().addColumnAfter().run(), !inTable)}
        {item('Delete row', () => c().deleteRow().run(), !inTable)}
        {item('Delete column', () => c().deleteColumn().run(), !inTable)}
        {item('Delete table', () => c().deleteTable().run(), !inTable)}
        {item('Clear formatting', () => c().unsetAllMarks().clearNodes().run())}
      </PopoverContent>
    </Popover>
  )
}

/**
 * Reddit's body box: toolbar over a rich editor. Read-only, it shows the same formatting the
 * worker should reproduce.
 */
export function BodyEditor({
  value,
  onChange,
  placeholder = 'Body text (optional)',
  bare,
  header,
  onEditor,
}: {
  value: PostNode | null
  onChange?: (doc: PostNode) => void
  placeholder?: string
  /** Mobile: no frame and no toolbar, as in Reddit's app. */
  bare?: boolean
  header?: ReactNode
  onEditor?: (e: Editor | null) => void
}) {
  const readOnly = !onChange
  const editor = useEditor({
    extensions: extensions(placeholder),
    content: value ?? undefined,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: { attributes: { class: cn('px-4 py-3', bare && 'px-0 py-1') } },
    onUpdate: ({ editor: e }) => onChange?.(e.getJSON() as PostNode),
  })
  useEffect(() => {
    onEditor?.(editor)
  }, [editor, onEditor])
  useEffect(() => {
    if (readOnly && editor && value) editor.commands.setContent(value)
  }, [readOnly, editor, value])
  return (
    <div
      className={cn(
        'rd-editor',
        !bare && 'rounded-[20px] border border-[var(--rd-border)] focus-within:border-[var(--rd-fg)]',
        !bare && !readOnly && 'resize-y overflow-auto',
      )}
    >
      {header}
      {editor && !readOnly && !bare ? <Toolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
    </div>
  )
}
