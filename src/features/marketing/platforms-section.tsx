import { Container } from './container'
import { type Platform, PLATFORM_LABEL, PlatformMark } from './platform-mark'
import { SectionHeading } from './section-heading'

const OTHERS: { platform: Platform; tasks: string }[] = [
  { platform: 'x', tasks: 'Replies, quote posts and threads' },
  { platform: 'linkedin', tasks: 'Thoughtful comments and short posts' },
  { platform: 'threads', tasks: 'Replies and conversation starters' },
  { platform: 'instagram', tasks: 'Comments on posts and reels' },
]

export function PlatformsSection() {
  return (
    <section aria-labelledby="platforms-title" className="bg-secondary/50 py-20 sm:py-28 dark:bg-card/40">
      <Container>
        <SectionHeading
          id="platforms-title"
          title="Mostly Reddit. Plus the apps you already scroll."
          lead="Every gig comes with a clear brief: where to post, what to write about, and any rules to follow."
        />
        <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:grid-rows-2">
          <article className="mk-reveal relative flex min-h-72 flex-col justify-between overflow-hidden rounded-3xl bg-primary p-7 text-primary-foreground col-span-2 md:row-span-2 sm:p-9">
            <PlatformMark
              platform="reddit"
              className="pointer-events-none absolute -right-10 -bottom-12 size-72 opacity-15"
              title=""
            />
            <div className="flex items-center gap-3">
              <PlatformMark platform="reddit" className="size-9" />
              <h3 className="font-display text-3xl font-bold">Reddit</h3>
            </div>
            <div className="relative space-y-5">
              <p className="max-w-sm text-lg leading-relaxed opacity-95">
                Posts, comments and replies in specific subreddits, from gaming and tech to city communities.
              </p>
              <ul className="flex flex-wrap gap-2 text-sm font-medium">
                {['Posts', 'Comments', 'Replies'].map((t) => (
                  <li key={t} className="rounded-full bg-primary-foreground/15 px-3 py-1 ring-1 ring-primary-foreground/25 ring-inset">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </article>
          {OTHERS.map(({ platform, tasks }) => (
            <article key={platform} className="mk-reveal flex flex-col justify-between gap-8 rounded-3xl border bg-card p-5 sm:p-6">
              <PlatformMark platform={platform} className="size-7" />
              <div>
                <h3 className="font-display text-lg font-semibold">{PLATFORM_LABEL[platform]}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{tasks}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Other platforms show up as new gigs come in.</p>
      </Container>
    </section>
  )
}
