import { z } from 'zod'

/**
 * Broadcast bodies arrive as the editor's document tree, never as HTML. Only the node and mark
 * types below parse, and `renderHtml` builds the markup itself, so nothing typed in the browser
 * reaches a worker's screen or inbox as raw HTML.
 */
const NODE_TYPES = [
  'doc',
  'paragraph',
  'heading',
  'text',
  'hardBreak',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'horizontalRule',
] as const
type NodeType = (typeof NODE_TYPES)[number]

const markSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bold') }),
  z.object({ type: z.literal('italic') }),
  z.object({ type: z.literal('underline') }),
  z.object({ type: z.literal('strike') }),
  z.object({ type: z.literal('link'), attrs: z.object({ href: z.string().max(2000) }) }),
])
type Mark = z.infer<typeof markSchema>

export type RichNode = {
  type: NodeType
  text?: string
  attrs?: { level?: number | null }
  marks?: Mark[]
  content?: RichNode[]
}

const nodeSchema: z.ZodType<RichNode> = z.lazy(() =>
  z.object({
    type: z.enum(NODE_TYPES),
    text: z.string().max(20_000).optional(),
    attrs: z.object({ level: z.number().int().min(1).max(6).nullish() }).optional(),
    marks: z.array(markSchema).max(10).optional(),
    content: z.array(nodeSchema).max(1000).optional(),
  }),
)

export const richDocSchema = nodeSchema.refine((n) => n.type === 'doc', 'Not a document')
export type RichDoc = RichNode

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function safeHref(href: string): string | null {
  const h = href.trim()
  if (/^(https?:|mailto:|tel:)/i.test(h)) return h
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(h)) return `https://${h}`
  return null
}

const MARK_TAGS: Record<Exclude<Mark['type'], 'link'>, string> = { bold: 'strong', italic: 'em', underline: 'u', strike: 's' }

function wrapMark(html: string, mark: Mark) {
  if (mark.type !== 'link') return `<${MARK_TAGS[mark.type]}>${html}</${MARK_TAGS[mark.type]}>`
  const href = safeHref(mark.attrs.href)
  return href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${html}</a>` : html
}

const simple = (tag: string) => (inner: string) => `<${tag}>${inner}</${tag}>`

const BLOCKS: Record<Exclude<NodeType, 'text'>, (inner: string, node: RichNode) => string> = {
  doc: (inner) => inner,
  paragraph: simple('p'),
  heading: (inner, n) => {
    const level = Math.min(Math.max(n.attrs?.level ?? 2, 2), 4)
    return `<h${level}>${inner}</h${level}>`
  },
  hardBreak: () => '<br>',
  bulletList: simple('ul'),
  orderedList: simple('ol'),
  listItem: simple('li'),
  blockquote: simple('blockquote'),
  horizontalRule: () => '<hr>',
}

export function renderHtml(node: RichNode): string {
  if (node.type === 'text') return (node.marks ?? []).reduce(wrapMark, esc(node.text ?? ''))
  return BLOCKS[node.type]((node.content ?? []).map(renderHtml).join(''), node)
}

const BLOCK_BREAKS = new Set<NodeType>(['paragraph', 'heading', 'listItem', 'blockquote', 'hardBreak', 'horizontalRule'])

/** The words alone, for push, the bell and email previews. */
export function plainText(node: RichNode): string {
  const walk = (n: RichNode): string => {
    if (n.type === 'text') return n.text ?? ''
    const inner = (n.content ?? []).map(walk).join('')
    return BLOCK_BREAKS.has(n.type) ? `${inner}\n` : inner
  }
  return walk(node)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

export function excerpt(text: string, max = 240) {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat
}
