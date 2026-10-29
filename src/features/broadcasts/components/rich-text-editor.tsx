import { type Editor, EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Strikethrough, Underline, Unlink } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Toggle } from '@/components/ui/toggle'
import type { RichDoc } from '../rich-text'

export const EMPTY_DOC: RichDoc = { type: 'doc', content: [{ type: 'paragraph' }] }

/** Only what the server renderer allows: no code, images or raw HTML. */
const extensions = [
  StarterKit.configure({
    code: false,
    codeBlock: false,
    heading: { levels: [2, 3] },
    link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
  }),
]

function Tool({
  editor,
  label,
  active,
  onPress,
  children,
}: {
  editor: Editor
  label: string
  active: boolean
  onPress: (e: Editor) => void
  children: ReactNode
}) {
  return (
    <Toggle
      size="sm"
      aria-label={label}
      title={label}
      pressed={active}
      onPressedChange={() => onPress(editor)}
      className="size-8 p-0"
    >
      {children}
    </Toggle>
  )
}

function LinkTool({ editor, active }: { editor: Editor; active: boolean }) {
  const [open, setOpen] = useState(false)
  const [href, setHref] = useState('')
  const apply = () => {
    const chain = editor.chain().focus().extendMarkRange('link')
    if (href.trim()) chain.setLink({ href: href.trim() }).run()
    else chain.unsetLink().run()
    setOpen(false)
  }
  if (active) {
    return (
      <Toggle
        size="sm"
        aria-label="Remove link"
        title="Remove link"
        pressed
        onPressedChange={() => editor.chain().focus().unsetLink().run()}
        className="size-8 p-0"
      >
        <Unlink />
      </Toggle>
    )
  }
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setHref('')
      }}
    >
      <PopoverTrigger asChild>
        <Toggle size="sm" aria-label="Add link" title="Add link" pressed={false} className="size-8 p-0">
          <Link2 />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            apply()
          }}
        >
          <Input
            autoFocus
            type="url"
            inputMode="url"
            placeholder="https://chat.whatsapp.com/…"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            className="h-8"
          />
          <Button type="submit" size="sm">
            Add
          </Button>
        </form>
        <p className="mt-1.5 px-0.5 text-xs text-muted-foreground">Select some text first to turn it into a link.</p>
      </PopoverContent>
    </Popover>
  )
}

export function RichTextEditor({ value, onChange, id }: { value: RichDoc; onChange: (doc: RichDoc) => void; id?: string }) {
  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class:
          'prose prose-sm max-w-none min-h-40 px-3 py-2.5 text-foreground dark:prose-invert prose-headings:font-display prose-a:text-primary prose-p:my-1.5 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichDoc),
  })
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            underline: e.isActive('underline'),
            strike: e.isActive('strike'),
            h2: e.isActive('heading', { level: 2 }),
            h3: e.isActive('heading', { level: 3 }),
            bullet: e.isActive('bulletList'),
            ordered: e.isActive('orderedList'),
            quote: e.isActive('blockquote'),
            link: e.isActive('link'),
          }
        : null,
  })

  return (
    <div className="overflow-hidden rounded-md border bg-transparent shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30">
      {editor && state ? (
        <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1">
          <Tool editor={editor} label="Bold" active={state.bold} onPress={(e) => e.chain().focus().toggleBold().run()}>
            <Bold />
          </Tool>
          <Tool editor={editor} label="Italic" active={state.italic} onPress={(e) => e.chain().focus().toggleItalic().run()}>
            <Italic />
          </Tool>
          <Tool
            editor={editor}
            label="Underline"
            active={state.underline}
            onPress={(e) => e.chain().focus().toggleUnderline().run()}
          >
            <Underline />
          </Tool>
          <Tool
            editor={editor}
            label="Strikethrough"
            active={state.strike}
            onPress={(e) => e.chain().focus().toggleStrike().run()}
          >
            <Strikethrough />
          </Tool>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <Tool
            editor={editor}
            label="Heading"
            active={state.h2}
            onPress={(e) => e.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 />
          </Tool>
          <Tool
            editor={editor}
            label="Subheading"
            active={state.h3}
            onPress={(e) => e.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 />
          </Tool>
          <Tool
            editor={editor}
            label="Bulleted list"
            active={state.bullet}
            onPress={(e) => e.chain().focus().toggleBulletList().run()}
          >
            <List />
          </Tool>
          <Tool
            editor={editor}
            label="Numbered list"
            active={state.ordered}
            onPress={(e) => e.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered />
          </Tool>
          <Tool editor={editor} label="Quote" active={state.quote} onPress={(e) => e.chain().focus().toggleBlockquote().run()}>
            <Quote />
          </Tool>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <LinkTool editor={editor} active={state.link} />
        </div>
      ) : (
        <div className="h-10 border-b bg-muted/40" />
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
