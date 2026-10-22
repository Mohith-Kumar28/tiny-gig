import { describe, expect, it } from 'vitest'
import { interpret, interpretAbout, isShareLink, parseRedditLink } from '@/features/reddit/verify'

describe('parseRedditLink', () => {
  it('reads posts and comments in the usual shapes', () => {
    expect(parseRedditLink('https://www.reddit.com/r/india/comments/1abc23/my_post_title/')).toEqual({ fullname: 't3_1abc23', kind: 'post' })
    expect(parseRedditLink('https://old.reddit.com/r/india/comments/1abc23/')).toEqual({ fullname: 't3_1abc23', kind: 'post' })
    expect(parseRedditLink('https://reddit.com/r/india/comments/1abc23/my_post/kx9z8y1/?context=3')).toEqual({ fullname: 't1_kx9z8y1', kind: 'comment' })
    expect(parseRedditLink('https://www.reddit.com/r/india/comments/1abc23/comment/kx9z8y1/')).toEqual({ fullname: 't1_kx9z8y1', kind: 'comment' })
    expect(parseRedditLink('https://redd.it/1abc23')).toEqual({ fullname: 't3_1abc23', kind: 'post' })
  })
  it('rejects non-Reddit and share links', () => {
    expect(parseRedditLink('https://x.com/a/status/1')).toBeNull()
    expect(parseRedditLink('https://www.reddit.com/r/india/s/AbCdEf12')).toBeNull()
    expect(isShareLink('https://www.reddit.com/r/india/s/AbCdEf12')).toBe(true)
  })
})

describe('interpret', () => {
  it('confirms live posts from the right account', () => {
    expect(interpret({ author: 'Foo', score: 12, num_comments: 3 }, 'foo')).toMatchObject({ state: 'live', detail: { score: 12, comments: 3 } })
  })
  it('spots removals, deletions and wrong authors', () => {
    expect(interpret({ author: 'foo', removed_by_category: 'moderator' }, 'foo')).toMatchObject({ state: 'removed', detail: { removedBy: 'moderators' } })
    expect(interpret({ author: 'foo', body: '[removed]' }, 'foo').state).toBe('removed')
    expect(interpret({ author: '[deleted]', removed_by_category: 'deleted' }, 'foo').state).toBe('deleted')
    expect(interpret({ author: 'bar' }, 'foo').state).toBe('wrong_author')
    expect(interpret(null, 'foo').state).toBe('missing')
  })
})

describe('interpretAbout', () => {
  it('maps account status and karma', () => {
    expect(interpretAbout(200, { total_karma: 1500 })).toEqual({ status: 'ok', karma: 1500 })
    expect(interpretAbout(200, { is_suspended: true })).toEqual({ status: 'suspended' })
    expect(interpretAbout(404, null)).toEqual({ status: 'not_found' })
    expect(interpretAbout(429, null)).toBeNull()
  })
})
