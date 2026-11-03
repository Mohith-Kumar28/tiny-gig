import { describe, expect, it } from 'vitest'
import { emptyPost, missingPiece, normalizeCommunity, type PostNode, redditPostSchema, redditSubmitUrl, toMarkdown } from '@/features/reddit-post/post'

const doc = (...content: PostNode[]): PostNode => ({ type: 'doc', content })
const p = (...content: PostNode[]): PostNode => ({ type: 'paragraph', content })
const t = (text: string, ...marks: string[]): PostNode => ({ type: 'text', text, marks: marks.map((type) => ({ type })) as PostNode['marks'] })

describe('normalizeCommunity', () => {
  it.each([
    ['developersindia', 'developersindia'],
    ['r/developersindia', 'developersindia'],
    ['/r/developersindia/', 'developersindia'],
    ['https://www.reddit.com/r/developersindia/comments/abc/x/', 'developersindia'],
    ['  r/India ', 'India'],
  ])('%s → %s', (input, out) => expect(normalizeCommunity(input)).toBe(out))
})

describe('toMarkdown', () => {
  it('writes Reddit markdown for marks, lists, quotes, code and tables', () => {
    const body = doc(
      p(t('bold', 'bold'), t(' '), t('spoil', 'spoiler'), t(' '), t('up', 'superscript')),
      { type: 'bulletList', content: [{ type: 'listItem', content: [p(t('one'))] }, { type: 'listItem', content: [p(t('two'))] }] },
      { type: 'blockquote', content: [p(t('quoted'))] },
      { type: 'codeBlock', content: [t('a\nb')] },
      {
        type: 'table',
        content: [
          { type: 'tableRow', content: [{ type: 'tableHeader', content: [p(t('H'))] }] },
          { type: 'tableRow', content: [{ type: 'tableCell', content: [p(t('v'))] }] },
        ],
      },
    )
    expect(toMarkdown(body)).toBe('**bold** >!spoil!< ^(up)\n\n* one\n* two\n\n> quoted\n\n    a\n    b\n\n| H |\n| :-- |\n| v |')
  })
})

describe('redditSubmitUrl', () => {
  it('prefills a text post in its community', () => {
    const url = new URL(redditSubmitUrl({ ...emptyPost('r/test'), title: 'Hi there', body: doc(p(t('hello'))) }))
    expect(url.pathname).toBe('/r/test/submit/')
    expect(url.searchParams.get('type')).toBe('TEXT')
    expect(url.searchParams.get('title')).toBe('Hi there')
    expect(url.searchParams.get('text')).toBe('hello')
  })
  it('prefills the URL for a link post', () => {
    const url = new URL(redditSubmitUrl({ ...emptyPost('test'), kind: 'link', title: 'x', url: 'https://example.com' }))
    expect(url.searchParams.get('type')).toBe('LINK')
    expect(url.searchParams.get('url')).toBe('https://example.com')
  })
})

describe('redditPostSchema', () => {
  const base = { ...emptyPost('test'), title: 'x' }
  it('accepts media uploaded here', () => {
    const body = doc({ type: 'image', attrs: { src: '/api/uploads/posts/abc.png' } })
    expect(redditPostSchema.safeParse({ ...base, body }).success).toBe(true)
  })
  it('rejects outside images and javascript links', () => {
    expect(redditPostSchema.safeParse({ ...base, body: doc({ type: 'image', attrs: { src: 'https://evil.test/x.png' } }) }).success).toBe(false)
    const link = doc(p({ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }))
    expect(redditPostSchema.safeParse({ ...base, body: link }).success).toBe(false)
  })
})

describe('missingPiece', () => {
  it('names what each tab still needs', () => {
    expect(missingPiece(emptyPost())).toBe('Pick a community.')
    expect(missingPiece(emptyPost('x'))).toBe('Add a title.')
    expect(missingPiece({ ...emptyPost('x'), title: 't', kind: 'media' })).toMatch(/Upload/)
    expect(missingPiece({ ...emptyPost('x'), title: 't', kind: 'link', url: 'nope' })).toMatch(/link URL/)
    expect(missingPiece({ ...emptyPost('x'), title: 't' })).toBeNull()
  })
})
