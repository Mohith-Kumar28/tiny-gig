# Product

<!-- impeccable:product-schema 1 -->

Inferred from the codebase, the owner's "Conditions & Rules v0.3" spec and conversation history; the owner asked for the redesign to proceed without an interview round. Facts marked (inferred) were not confirmed in words.

## Platform

web

## Users

- **Workers:** people in India, 18+, who own Reddit accounts (often several) and sometimes X, LinkedIn, Threads or Instagram accounts. They use TinyGig on their phones (inferred: mostly Android, mid-range, on mobile data) to raise their hand for small paid posting gigs, submit proof and get paid by UPI. Many are students or early-career (inferred).
- **Staff / admins:** a small ops team run by the owner. They keep a live register of every Reddit account (standing, age, karma, cooldowns), pick which account does which gig, review proof (link, then insights screenshot after a 24h hold), and pay out weekly by UPI with a UTR reference. They work at a laptop, many hours a day (inferred).

## Product Purpose

TinyGig is a live register of real people's social accounts, mostly Reddit, that does paid posting work for clients. Gigs, selection, cooldowns, levels and payouts exist to keep that register accurate and the accounts healthy. Success for workers: clear gigs, fair selection, fast and visible UPI payouts. Success for staff: the right account picked for every slot without breaking cooldowns, and nothing slipping through review.

## Positioning

Not a marketplace where anyone grabs tasks: workers raise their hand, staff pick the best-fit account per slot, and pay rises with the age of the account doing the work (levels L1 to L4). Payment is by UPI in rupees, reviewed by humans, with a UTR reference for every payout.

## Operating Context

- Interest window (default 10 minutes) after a gig is published, then staff selection.
- Two-step proof: submit link, 24h live hold, upload insights screenshot, staff review, approve.
- Cooldowns by person and by account (same community 7 days, client limits, IST calendar days, rolling weeks).
- Clients are never shown to workers.
- Weekly payout run on Monday (IST), no minimum.
- Web push and email notifications.

## Capabilities and Constraints

- TanStack Start on Cloudflare Workers, D1, R2, shadcn/ui components, Tailwind v4, lucide icons.
- Worker app is mobile-first with a bottom tab bar; admin is a desktop sidebar console.
- Rates are placeholders editable in Settings; real numbers are the owner's to fill.
- Reddit API automation is out (Responsible Builder Policy); live checks are manual.

## Brand Commitments

- Name: TinyGig. Existing mark: a lowercase "t" tile. (Colour and type are not committed; the owner asked for a significant visual upgrade that does not look AI-generated.)
- Voice: plain, direct English for Indian readers; rupees with ₹; "gig", "raise your hand", "UPI", "UTR".

## Evidence on Hand

- No testimonials, customer logos, worker counts or payout totals exist. Do not invent them.
- Example gigs on marketing pages must be labelled as examples.
- Platform marks for Reddit, X, LinkedIn, Threads, Instagram exist in code.

## Product Principles

1. Money is always explicit: exact rupees, when it lands, and why.
2. Tell people what is next, never just the state they are in.
3. The register is the truth: account health beats volume.
4. Phone first for workers, keyboard-and-table first for staff.
5. Honest about the rules: cooldowns, holds and account-loss risk are said plainly.

## Accessibility & Inclusion

- WCAG AA contrast; works on small Android screens and slow connections (inferred).
- English only for now (inferred).
