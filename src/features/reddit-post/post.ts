import { z } from 'zod'

/** Reddit's create-post tabs that a post brief can use. */
export const POST_KINDS = ['text', 'media', 'link'] as const
export type PostKind = (typeof POST_KINDS)[number]

export const TITLE_MAX = 300
export const BODY_MAX = 40_000
export const MAX_MEDIA = 20

/** Editor nodes and marks a post body may contain. Anything else fails to parse. */
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
  'codeBlock',
  'horizontalRule',
  'image',
  'redditVideo',
  'table',
  'tableRow',
  'tableHeader',
  'tableCell',
] as const
const MARK_TYPES = ['bold', 'italic', 'strike', 'superscript', 'code', 'link', 'spoiler'] as const

export type PostNode = {
  type: (typeof NODE_TYPES)[number]
  text?: string
  attrs?: Record<string, string | number | boolean | null>
  marks?: { type: (typeof MARK_TYPES)[number]; attrs?: Record<string, string | number | boolean | null> }[]
  content?: PostNode[]
}

/** Uploaded post media lives under this prefix and is the only src an image or video node may use. */
export const POST_MEDIA_PREFIX = 'posts/'
export const mediaUrl = (key: string) => `/api/uploads/${key}`
const isOwnMedia = (src: unknown) =>
  typeof src === 'string' && src.startsWith(`/api/uploads/${POST_MEDIA_PREFIX}`) && !src.includes('..')

const attrsSchema = z.record(z.string().max(40), z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]))

const nodeSchema: z.ZodType<PostNode> = z.lazy(() =>
  z
    .object({
      type: z.enum(NODE_TYPES),
      text: z.string().max(BODY_MAX).optional(),
      attrs: attrsSchema.optional(),
      marks: z
        .array(
          z
            .object({ type: z.enum(MARK_TYPES), attrs: attrsSchema.optional() })
            .refine((m) => m.type !== 'link' || /^https?:\/\//i.test(String(m.attrs?.href ?? '')), 'Links must be http(s)'),
        )
        .max(10)
        .optional(),
      content: z.array(nodeSchema).max(2000).optional(),
    })
    .refine((n) => (n.type !== 'image' && n.type !== 'redditVideo') || isOwnMedia(n.attrs?.src), 'Media must be uploaded here'),
)

export const mediaSchema = z.object({
  key: z
    .string()
    .startsWith(POST_MEDIA_PREFIX)
    .max(200)
    .regex(/^[\w/.-]+$/),
  type: z.enum(['image', 'video']),
  name: z.string().trim().max(200),
})
export type PostMedia = z.infer<typeof mediaSchema>

export const redditPostSchema = z.object({
  community: z.string().trim().max(200),
  kind: z.enum(POST_KINDS),
  title: z.string().trim().max(TITLE_MAX),
  body: nodeSchema.refine((n) => n.type === 'doc', 'Not a document').nullable(),
  url: z.string().trim().max(2000),
  media: z.array(mediaSchema).max(MAX_MEDIA),
  nsfw: z.boolean(),
  spoiler: z.boolean(),
  brand: z.boolean(),
  flair: z.string().trim().max(64),
})
export type RedditPost = z.infer<typeof redditPostSchema>

export const EMPTY_BODY: PostNode = { type: 'doc', content: [{ type: 'paragraph' }] }

export function emptyPost(community?: string | null): RedditPost {
  return {
    community: normalizeCommunity(community ?? ''),
    kind: 'text',
    title: '',
    body: null,
    url: '',
    media: [],
    nsfw: false,
    spoiler: false,
    brand: false,
    flair: '',
  }
}

/** "r/foo", "/r/foo/", "https://www.reddit.com/r/foo/comments/…" and "foo" all become "foo". */
export function normalizeCommunity(input: string): string {
  const s = input.trim()
  const fromUrl = s.match(/reddit\.com\/r\/([A-Za-z0-9_]+)/i)
  if (fromUrl?.[1]) return fromUrl[1]
  return s
    .replace(/^\/?r\//i, '')
    .replace(/\/.*$/, '')
    .replace(/[^A-Za-z0-9_]/g, '')
    .slice(0, 50)
}

function plainText(n: PostNode): string {
  if (n.type === 'text') return n.text ?? ''
  if (n.type === 'hardBreak') return '\n'
  return (n.content ?? []).map(plainText).join('')
}

/** True when the body has words, a table, or inline media, not just empty paragraphs. */
export function hasBody(body: PostNode | null | undefined): boolean {
  if (!body) return false
  const walk = (n: PostNode): boolean =>
    (n.type === 'text' && !!n.text?.trim()) ||
    ['image', 'redditVideo', 'table', 'horizontalRule'].includes(n.type) ||
    (n.content ?? []).some(walk)
  return walk(body)
}

/** Staff started filling the post in, so it must be finished before it's saved. */
export function isPostTouched(p: RedditPost): boolean {
  return !!(p.title.trim() || p.url.trim() || p.media.length || hasBody(p.body))
}

/** What still stops the post being handed over, in words, or null once its tab's fields are filled. */
export function missingPiece(p: RedditPost): string | null {
  if (!p.community) return 'Pick a community.'
  if (!p.title.trim()) return 'Add a title.'
  if (p.kind === 'link' && !/^https?:\/\/\S+\.\S+$/i.test(p.url.trim())) return 'Add the link URL, starting with https://'
  if (p.kind === 'media' && !p.media.length) return 'Upload at least one image or video.'
  return null
}

function inlineMd(nodes: PostNode[] = []): string {
  return nodes
    .map((n) => {
      if (n.type === 'hardBreak') return '  \n'
      if (n.type === 'image') return ''
      if (n.type !== 'text') return inlineMd(n.content)
      let t = n.text ?? ''
      const marks = n.marks ?? []
      if (marks.some((m) => m.type === 'code')) return `\`${t}\``
      if (marks.some((m) => m.type === 'bold')) t = `**${t}**`
      if (marks.some((m) => m.type === 'italic')) t = `*${t}*`
      if (marks.some((m) => m.type === 'strike')) t = `~~${t}~~`
      if (marks.some((m) => m.type === 'superscript')) t = `^(${t})`
      if (marks.some((m) => m.type === 'spoiler')) t = `>!${t}!<`
      const link = marks.find((m) => m.type === 'link')
      if (link) t = `[${t}](${link.attrs?.href})`
      return t
    })
    .join('')
}

function blockMd(n: PostNode, depth = 0): string {
  const kids = n.content ?? []
  switch (n.type) {
    case 'paragraph':
      return inlineMd(kids)
    case 'heading':
      return `${'#'.repeat(Number(n.attrs?.level ?? 1))} ${inlineMd(kids)}`
    case 'blockquote':
      return kids
        .map((k) => blockMd(k, depth))
        .join('\n\n')
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')
    case 'codeBlock':
      return plainText(n)
        .split('\n')
        .map((l) => `    ${l}`)
        .join('\n')
    case 'horizontalRule':
      return '---'
    case 'bulletList':
    case 'orderedList':
      return kids
        .map((li, i) => {
          const marker = n.type === 'orderedList' ? `${i + 1}.` : '*'
          const [first, ...rest] = (li.content ?? []).map((k) => blockMd(k, depth + 1))
          const pad = '    '.repeat(depth)
          return [`${pad}${marker} ${first ?? ''}`, ...rest.map((r) => r.replace(/^/gm, `${pad}    `))].join('\n')
        })
        .join('\n')
    case 'table': {
      const rows = kids.map((r) =>
        (r.content ?? []).map((c) =>
          (c.content ?? [])
            .map((p) => inlineMd(p.content))
            .join(' ')
            .replace(/\|/g, '\\|'),
        ),
      )
      if (!rows.length) return ''
      const width = Math.max(...rows.map((r) => r.length))
      const line = (cells: string[]) => `| ${Array.from({ length: width }, (_, i) => cells[i] ?? '').join(' | ')} |`
      return [line(rows[0] ?? []), line(Array(width).fill(':--')), ...rows.slice(1).map(line)].join('\n')
    }
    case 'image':
    case 'redditVideo':
      return ''
    default:
      return inlineMd(kids)
  }
}

/** Reddit-flavoured Markdown, for the Markdown editor and for prefilling the submit page. */
export function toMarkdown(body: PostNode | null | undefined): string {
  if (!body) return ''
  return (body.content ?? [])
    .map((b) => blockMd(b))
    .filter((s) => s.trim())
    .join('\n\n')
}

/**
 * Reddit's submit page reads title, text, url and type from the query string on the web. Media
 * can't be passed this way, so the worker attaches downloaded files by hand.
 */
export function redditSubmitUrl(p: RedditPost): string {
  const params = new URLSearchParams()
  params.set('type', p.kind === 'link' ? 'LINK' : p.kind === 'media' ? 'IMAGE' : 'TEXT')
  if (p.title) params.set('title', p.title)
  if (p.kind === 'link' && p.url) params.set('url', p.url)
  const md = toMarkdown(p.body)
  if (md && p.kind === 'text') {
    params.set('selftext', 'true')
    params.set('text', md)
  }
  const base = p.community ? `https://www.reddit.com/r/${p.community}/submit/` : 'https://www.reddit.com/submit/'
  return `${base}?${params.toString()}`
}
