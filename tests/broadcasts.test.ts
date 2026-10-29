import { describe, expect, it } from 'vitest'
import { workerLevel } from '@/features/accounts/rules'
import { matchesBroadcastAudience } from '@/features/broadcasts/audience'
import { plainText, renderHtml, richDocSchema } from '@/features/broadcasts/rich-text'

const at = new Date('2026-10-29T00:00:00Z')
const reddit = (createdOn: string | null, standing = 'active') => ({
  platform: 'reddit',
  createdOn: createdOn ? new Date(createdOn) : null,
  standing,
})

describe('workerLevel', () => {
  it('is warm-up with no dated Reddit account', () => {
    expect(workerLevel([], at)).toBe('warmup')
    expect(workerLevel([reddit(null)], at)).toBe('warmup')
    expect(workerLevel([{ platform: 'x', createdOn: new Date('2020-01-01'), standing: 'active' }], at)).toBe('warmup')
  })
  it('takes the best usable account', () => {
    expect(workerLevel([reddit('2026-10-20'), reddit('2026-06-01')], at)).toBe('L2')
    expect(workerLevel([reddit('2026-06-01'), reddit('2020-01-01', 'banned')], at)).toBe('L2')
    expect(workerLevel([reddit('2020-01-01', 'warned')], at)).toBe('L4')
  })
})

describe('broadcast audience', () => {
  const w = { userId: 'u1', state: 'Kerala', level: 'L1' as const }
  it('filters by level and state, empty meaning any', () => {
    expect(matchesBroadcastAudience({ type: 'filter', levels: [], states: [] }, w)).toBe(true)
    expect(matchesBroadcastAudience({ type: 'filter', levels: ['L1', 'L2'], states: [] }, w)).toBe(true)
    expect(matchesBroadcastAudience({ type: 'filter', levels: ['warmup'], states: [] }, w)).toBe(false)
    expect(matchesBroadcastAudience({ type: 'filter', levels: ['L1'], states: ['Goa'] }, w)).toBe(false)
  })
  it('picks named workers', () => {
    expect(matchesBroadcastAudience({ type: 'workers', workerIds: ['u1'] }, w)).toBe(true)
    expect(matchesBroadcastAudience({ type: 'workers', workerIds: ['u2'] }, w)).toBe(false)
  })
})

describe('rich text', () => {
  const doc = richDocSchema.parse({
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'New group' }] },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Join <here> ', marks: [{ type: 'bold' }] },
          {
            type: 'text',
            text: 'link',
            marks: [{ type: 'link', attrs: { href: 'https://chat.whatsapp.com/abc', target: '_blank' } }],
          },
        ],
      },
      {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] }],
      },
    ],
  })

  it('renders an allow-listed subset with text escaped', () => {
    expect(renderHtml(doc)).toBe(
      '<h2>New group</h2><p><strong>Join &lt;here&gt; </strong><a href="https://chat.whatsapp.com/abc" target="_blank" rel="noopener noreferrer">link</a></p><ul><li><p>one</p></li></ul>',
    )
  })

  it('drops unsafe links and rejects unknown nodes', () => {
    const js = richDocSchema.parse({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }],
        },
      ],
    })
    expect(renderHtml(js)).toBe('<p>x</p>')
    expect(richDocSchema.safeParse({ type: 'doc', content: [{ type: 'image', attrs: { src: 'x' } }] }).success).toBe(false)
    expect(richDocSchema.safeParse({ type: 'paragraph' }).success).toBe(false)
  })

  it('flattens to plain text for push and previews', () => {
    expect(plainText(doc)).toBe('New group\nJoin <here> link\none')
  })
})
