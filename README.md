# TinyGig

Gig-work platform for small social-media tasks (Reddit first, plus X, LinkedIn, Threads, Instagram).
Admins post gigs → approved workers claim a slot → submit proof → admins review (approve / request changes / reject, with an optional "keep it live N hours" check) → approved earnings are paid manually by UPI.

**Stack:** TanStack Start (React 19) on Cloudflare Workers · D1 + Drizzle · R2 (proof screenshots) · KV (rate limits) · Cron Triggers · Better Auth (Google + email OTP) · Resend + React Email · Tailwind v4 + shadcn/ui · TanStack Query/Table.

## Local development

```bash
bun install
cp .dev.vars.example .dev.vars        # fill BETTER_AUTH_SECRET; leave RESEND_API_KEY empty in dev
bun run db:migrate:local               # create local D1 tables
bun run db:seed:local                  # optional demo data (workers, gigs, submissions, referrals)
bun run dev                            # http://localhost:3000
```

- With no `RESEND_API_KEY`, emails (including sign-in codes) are **printed to the dev console** and recorded in the Email log as `logged`.
- Any email listed in `ADMIN_EMAILS` (wrangler.jsonc `vars`) becomes an admin on first sign-in.
- Trigger the cron locally: `curl -X POST "http://localhost:3000/cdn-cgi/local/explorer/api/local/scheduled?worker=tinygig" -H 'content-type: application/json' -d '{"cron":"*/15 * * * *"}'`

```bash
bun run typecheck   # tsc
bun run test        # vitest (state machine, referral rules, eligibility)
bun run build
```

## Deploying to Cloudflare

```bash
npx wrangler login
npx wrangler d1 create tinygig-db              # paste database_id into wrangler.jsonc
npx wrangler kv namespace create CACHE         # paste id into wrangler.jsonc
npx wrangler r2 bucket create tinygig-uploads
# set APP_URL, EMAIL_FROM, ADMIN_EMAILS in wrangler.jsonc "vars"
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put RESEND_API_KEY
bun run db:migrate:remote
bun run deploy
```

Google OAuth redirect URI: `https://<your-domain>/api/auth/callback/google`. Verify your sending domain in Resend and use it in `EMAIL_FROM`.

## Layout

```
src/
  routes/            thin route files (landing, /login, /_app/onboarding|pending, /_app/w/*, /_app/admin/*, /api/*, /r/$code)
  features/<domain>/ components/ · server/ (createServerFn + services) · schemas.ts · queries.ts
  components/        ui/ (shadcn) · data-table/ (server-driven table kit) · shared/ · layout/
  db/schema/         Drizzle tables (auth, app, referrals) + enums
  emails/            React Email layout, typed templates, sendEmail/queueEmail
  lib/               env, auth, table-query, format, server middleware/rate-limit
  server.ts          Worker entry (fetch + scheduled)
```

Conventions:
- **Server-fn files** (`features/*/server/*.ts` exporting `createServerFn`) must only export server functions and zod schemas. Put reusable server logic in service modules (`review-service.ts`, `engine.ts`, `settings-store.ts`, `stats.ts`) so the client bundle never pulls in D1/env.
- Money is stored as integer **paise**; forms take rupees.
- Tables are server-driven: filters, sort and pagination live in URL search params (`lib/table-query.ts`).

## Workflow states

`claimed → submitted → (changes_requested ⇄ resubmitted) → live_check → approved | rejected` plus `expired` (cron) and `withdrawn`. Slots are reserved with an atomic conditional `UPDATE … WHERE claimed_slots < total_slots`.

## Referral programs

Admins build rules at **/admin/referrals/programs**: a trigger milestone (signed up / approved / first gig approved / N gigs / earned ₹X), how many referred workers are needed, rewards for the referrer and referee, repeat and caps, a qualify-within window, dates, and auto-approve or review. The engine (`features/referrals/server/engine.ts`) issues rewards idempotently. Approved rewards join the normal payout flow.
