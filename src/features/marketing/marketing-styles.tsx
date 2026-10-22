/**
 * CSS-only motion for marketing pages, gated behind prefers-reduced-motion: no-preference.
 * One authored moment: ledger entries are "written in" left to right, and the settled total
 * lands last. Timeline rows on the landing page write in the same way as they scroll into view.
 */
const CSS = `
@keyframes mk-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes mk-write { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes mk-settle { 0% { opacity: 0; transform: scale(1.12) rotate(-4deg); } 60% { opacity: 1; transform: scale(0.97) rotate(-4deg); } 100% { opacity: 1; transform: rotate(-4deg); } }
@media (prefers-reduced-motion: no-preference) {
  .mk-rise { animation: mk-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i, 0) * 80ms); }
  .mk-write { animation: mk-write 0.55s cubic-bezier(0.65, 0, 0.35, 1) both; animation-delay: calc(350ms + var(--i, 0) * 170ms); }
  .mk-settle { animation: mk-settle 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(350ms + var(--i, 0) * 170ms); }
  @supports (animation-timeline: view()) {
    .mk-write-scroll { animation: mk-write linear both; animation-timeline: view(); animation-range: entry 10% entry 60%; }
  }
}
`

export function MarketingStyles() {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: static stylesheet
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />
}
