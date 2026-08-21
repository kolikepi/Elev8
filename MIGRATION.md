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
  alert, order status update) go through it. Domain `elev8wear.al` is
  verified in Resend (DKIM/SPF/DMARC DNS records added at the registrar).
  Still need to put `RESEND_API_KEY`/`EMAIL_FROM` in `.env` and in Vercel's
  env vars once deployed.
- **Database is migrated.** Created a Neon Postgres project. Since the
  Abacus-hosted DB only had demo/seed data (no real customer orders to
  preserve), we generated the schema as raw SQL from `prisma/schema.prisma`
  (`prisma migrate diff --from-empty`) and the seed data as raw SQL from
  `scripts/seed.ts`, and ran both through Neon's SQL Editor (this sandboxed
  session can't open a direct Postgres/HTTPS connection to any DB, by
  design — verified via `psql` timeout and a blocked egress-proxy CONNECT).
  Verified row counts in Neon match: 12 products, 4 DTF designs, 2 users,
  1 shipping settings row. Still need to put the Neon `DATABASE_URL` in
  `.env` and Vercel's env vars.

## Remaining Abacus dependencies (need your input to finish)

### 1. File storage — Abacus-hosted S3 bucket
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

### 2. Hosting
The live site is deployed at `elev8.abacusai.app`. Once storage is migrated,
deploy this repo to a host you control (Vercel is the easiest fit for
Next.js) and point your domain (`elev8wear.al`) at it, with `DATABASE_URL`
(Neon), `RESEND_API_KEY`/`EMAIL_FROM` (Resend), and the AWS variables set
as environment variables there.

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
