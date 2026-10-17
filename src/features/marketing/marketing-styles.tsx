/**
 * CSS-only motion for marketing pages. Scoped class names (mk-*), all gated behind
 * prefers-reduced-motion: no-preference. Scroll reveals use scroll-driven animations
 * where supported and are simply static elsewhere.
 */
const CSS = `
@keyframes mk-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes mk-deal { from { opacity: 0; transform: translateY(28px) rotate(var(--mk-r0, 0deg)); } to { opacity: 1; transform: translateY(0) rotate(var(--mk-r, 0deg)); } }
.mk-ticket { transform: rotate(var(--mk-r, 0deg)); }
@media (prefers-reduced-motion: no-preference) {
  .mk-rise { animation: mk-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i, 0) * 90ms); }
  .mk-ticket { animation: mk-deal 1s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(250ms + var(--i, 0) * 140ms); transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
  .mk-stack:hover .mk-ticket { transform: translateY(calc(var(--i, 0) * -6px)) rotate(calc(var(--mk-r, 0deg) * 1.6)); }
  @supports (animation-timeline: view()) {
    .mk-reveal { animation: mk-rise linear both; animation-timeline: view(); animation-range: entry 5% entry 45%; }
  }
}
`

export function MarketingStyles() {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: static stylesheet
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />
}
