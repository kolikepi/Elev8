# Migrating off Abacus.AI

This app was originally built and hosted on Abacus.AI. This document lists
every place the codebase currently depends on Abacus-owned infrastructure,
and what to do to become fully independent.

## What's already been cleaned up (done)

- Removed the Abacus-injected build-time client-error reporter from
  `next.config.js` (it wrote a webpack entry that beaconed browser errors to
  `/__abacus/client-error`, an endpoint that only exists on Abacus hosting).
- Removed the Abacus chat/editor widget `<script>` tag
  (`apps.abacus.ai/chatllm/appllm-lib.js`) from `app/layout.tsx`. It was
  Abacus's own in-builder assistant script, not a customer-facing feature.
- Removed `.yarnrc.yml`'s hardcoded Abacus host path
  (`/opt/hostedapp/node/yarn/global`) so installs work on any machine/CI.
- Added `.gitignore` and `.env.example` so secrets never get committed and
  anyone can see which variables are required to run the app.
- The real `.env` (with live credentials) was intentionally **not**
  committed. See "Rotate secrets" below.
- **Email is migrated.** `lib/email.ts` now sends via Resend
  (`RESEND_API_KEY` + `EMAIL_FROM`) instead of Abacus's notification API.
  All four send sites (contact form, order confirmation, new-order admin
  alert, order status update) go through it. You still need to: create a
  Resend account, verify a sending domain for `elev8wear.al`, and put
  `RESEND_API_KEY`/`EMAIL_FROM` in `.env` (and in Vercel's env vars once
  deployed) — until then emails just log an error and are skipped, orders
  still save fine.

## Remaining Abacus dependencies (need your input to finish)

### 1. Database — Abacus-hosted Postgres
`DATABASE_URL` currently points at `*.hosteddb.reai.io`, a Postgres instance
Abacus provisions and owns. To own your data:
1. Create a Postgres database with a provider of your choice (Neon, Supabase,
   Railway, or your own server/RDS).
2. `pg_dump` the Abacus database and restore it into the new one (or run
   `prisma migrate deploy` / `prisma db push` against the new empty DB and
   re-seed if you don't need to keep existing orders/users).
3. Update `DATABASE_URL` to the new connection string.

### 2. File storage — Abacus-hosted S3 bucket
`AWS_BUCKET_NAME=abacusai-apps-...` is a bucket inside Abacus's own AWS
account, and the app authenticates with an implicit instance credential
(no access key is stored anywhere) — so uploads simply won't work once this
runs outside Abacus's hosting.
1. Create your own S3 bucket (or Cloudflare R2 / another S3-compatible
   store) and an IAM user scoped to it.
2. Copy the existing objects from the Abacus bucket into your bucket.
3. Set `AWS_BUCKET_NAME`, `AWS_REGION`, and real
   `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` in your `.env`.
4. All product/hero images currently reference `cdn.abacus.ai` URLs directly
   (in `home-client.tsx`, `about/page.tsx`, `mockup-editor.tsx`, and the
   `Product` rows in the database). Once you have your own bucket, download
   those images and re-upload them, then update the URLs (DB rows via admin
   panel or a script; hardcoded ones in code via find/replace).

### 3. Transactional email — done in code, needs your Resend account
Done: all sending now goes through `lib/email.ts` using Resend. Left for
you:
1. Create a Resend account, add and verify `elev8wear.al` (DNS records).
2. Set `RESEND_API_KEY` and `EMAIL_FROM` in `.env` / your host's env vars.

### 4. Hosting
The live site is deployed at `elev8.abacusai.app`. Once the above three are
migrated, deploy this repo to a host you control (Vercel is the easiest fit
for Next.js) and point your domain (`elev8wear.al`) at it.

## Rotate secrets

The exported `.env` contained live credentials (database password,
`NEXTAUTH_SECRET`, `ABACUSAI_API_KEY`). They were **not** committed to this
repo, but since they passed through a downloaded zip file, treat them as
exposed:
- Rotate `NEXTAUTH_SECRET` once you cut over (this invalidates existing
  login sessions, which is fine).
- The `DATABASE_URL` password and `ABACUSAI_API_KEY` become moot once you
  migrate off Abacus's database/email per above — no action needed beyond
  not reusing them elsewhere.
