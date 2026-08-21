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

- **File storage is migrated.** Created our own S3 bucket
  (`elev8wear-uploads`, `eu-north-1`) with a bucket policy that public-reads
  only the `public/*` prefix, CORS for browser uploads, and an IAM user
  (`elev8wear-app`) scoped to just this bucket (`PutObject`/`GetObject`/
  `DeleteObject`/`ListBucket` — nothing else). Verified end-to-end
  (put/get/public-read) from a throwaway script before wiring the real
  credentials in. New uploads through the admin panel now land here, not
  on Abacus's shared bucket.
- **Hosting is migrated.** Deployed this repo to Vercel (Production =
  `claude/elev8wear-faqja-5wv1su`, the repo's only branch), with
  `DATABASE_URL` (Neon), `RESEND_API_KEY`/`EMAIL_FROM` (Resend), and the
  `AWS_*` variables set as Vercel env vars. Fixed two Vercel-specific build
  issues along the way: added `.npmrc` (`legacy-peer-deps=true` — a
  pre-existing eslint/typescript-eslint peer conflict from the Abacus
  export made plain `npm install` fail) and a `postinstall: prisma
  generate` script (Vercel caches `node_modules`, which otherwise skips
  Prisma's client generation and breaks every DB-backed route). Custom
  domain `elev8wear.al` is attached and DNS-verified at Host.al (A record
  `@` → Vercel's IP, CNAME `www` → Vercel's target), replacing the old
  record that pointed at Abacus's hosting IP. Site is live at
  `https://elev8wear.al`, off Abacus entirely.

## Remaining: re-host product images off cdn.abacus.ai

Product/hero images still reference `cdn.abacus.ai` URLs directly (in
`home-client.tsx`, `about/page.tsx`, `mockup-editor.tsx`, `scripts/seed.ts`,
and the `Product`/`DtfDesign` rows in the DB). This is **not urgent** —
`cdn.abacus.ai` is still a live, working CDN for real site visitors, so
nothing is broken. It only needs to happen before the Abacus account is
cancelled. This dev session couldn't fetch from `cdn.abacus.ai` itself (its
egress policy blocks that host), so do it through the app once deployed:
use the existing "add from URL" admin feature (`/api/admin/upload-url`) per
product, which downloads the image server-side (Vercel has normal internet
access) and re-uploads it to the new S3 bucket.

## Rotate secrets

The exported `.env` contained live credentials (database password,
`NEXTAUTH_SECRET`, `ABACUSAI_API_KEY`). They were **not** committed to this
repo, but since they passed through a downloaded zip file, treat them as
exposed. `NEXTAUTH_SECRET` was already regenerated fresh for the Vercel
deployment (never reused the exposed one). The old `DATABASE_URL` password
and `ABACUSAI_API_KEY` are moot now that the app no longer uses Abacus's
database or email — no action needed beyond not reusing them elsewhere.

## Last step: cancel the Abacus account

Once you've re-hosted the images (above) and are confident the new stack
is stable, cancel/downgrade the Abacus.AI account. Everything this app
needs — database, storage, email, hosting, DNS — now runs on
infrastructure you own and control directly.
