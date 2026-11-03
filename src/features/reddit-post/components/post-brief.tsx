import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { type RedditPost, redditSubmitUrl, toMarkdown } from '../post'
import { RedditComposer } from './reddit-composer'

function allText(p: RedditPost) {
  const tags = [p.nsfw && 'NSFW', p.spoiler && 'Spoiler', p.brand && 'Brand affiliate', p.flair && `Flair: ${p.flair}`].filter(
    Boolean,
  )
  return [
    `Community: r/${p.community}`,
    `Title: ${p.title}`,
    p.kind === 'link' ? `Link: ${p.url}` : null,
    tags.length ? `Tags: ${tags.join(', ')}` : null,
    toMarkdown(p.body) ? `Body:\n${toMarkdown(p.body)}` : null,
    p.kind === 'media' ? `Media: ${p.media.length} file${p.media.length === 1 ? '' : 's'} to upload, in order` : null,
  ]
    .filter(Boolean)
    .join('\n\n')
}

const KIND_TAB = { text: 'Text', media: 'Images & Video', link: 'Link' } as const

/** The worker's copy of the post: Reddit's own screen, read-only, with the steps to reproduce it. */
export function PostBrief({ post, accountLabel }: { post: RedditPost; accountLabel?: string | null }) {
  const tags = [
    post.nsfw && 'NSFW',
    post.spoiler && 'Spoiler',
    post.brand && 'Brand affiliate',
    post.flair && `the “${post.flair}” flair`,
  ].filter(Boolean)
  return (
    <div className="space-y-3">
      <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed marker:font-semibold marker:text-muted-foreground">
        <li>
          Sign in to Reddit as <strong>{accountLabel ?? 'your assigned account'}</strong>, then tap{' '}
          <strong>Post on Reddit</strong>. It opens <strong>r/{post.community}</strong> on the{' '}
          <strong>{KIND_TAB[post.kind]}</strong> tab.
        </li>
        <li>
          Check the title{post.kind === 'text' ? ' and body' : ''} came through. If a field is empty, use its Copy button below
          and paste it in.
        </li>
        {post.kind === 'media' ? <li>Download every image or video below and upload them in the same order.</li> : null}
        {post.kind === 'link' ? <li>Paste the link into Link URL if it isn’t there already.</li> : null}
        {tags.length ? <li>Add {tags.join(', ')}.</li> : null}
        <li>Make it look exactly like the preview, post it, then paste the post’s link below.</li>
      </ol>
      <div className="overflow-hidden rounded-2xl border">
        <RedditComposer
          value={post}
          primary={{
            label: (
              <>
                Post on Reddit <ExternalLink />
              </>
            ),
            href: redditSubmitUrl(post),
          }}
          secondary={{
            label: 'Copy all',
            onClick: async () => {
              await navigator.clipboard.writeText(allText(post))
              toast.success('Everything copied')
            },
          }}
        />
      </div>
    </div>
  )
}
