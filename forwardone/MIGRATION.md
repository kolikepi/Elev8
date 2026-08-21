# ForwardOne — getting the app and its data off Abacus.AI

ForwardOne is the logistics operations app (courier / road freight / customs,
Albania ↔ Europe) that was built and hosted on Abacus.AI. This is the same
exercise already done for the Elev8 shop (see `../MIGRATION.md`), applied to
the second app.

## Where ForwardOne's data actually lives

Four separate places, and a database dump only covers the first one:

| What | Where it lives on Abacus | How to get it out |
| --- | --- | --- |
| Relational data — users, organizations, quotes, quotations, shipments, tracking events, invoices, tariffs, geo tables | Abacus-hosted Postgres, `db-ad69048e4.db006.hosteddb.reai.io:5432` (credentials in the exported `.env`) | `scripts/export-abacus-db.sh` |
| Uploaded documents — quote attachments, shipment documents, tariff import spreadsheets | Abacus's **shared** S3 bucket, under our own `AWS_FOLDER_PREFIX`. The DB stores only the key (`cloud_storage_path`), never the bytes | `scripts/export-abacus-files.mjs` (must run inside Abacus — see below) |
| Email templates | Abacus notification templates, referenced by the `NOTIF_ID_*` ids in `.env` | Not exportable; the HTML lives in `lib/email.ts` in this repo, so nothing is lost — only the delivery mechanism has to be replaced |
| App source | Abacus workspace | Already done — it is this directory |

## Done in this commit

- **Source imported.** The full Next.js app (app router, components, lib,
  prisma schema, seed and import scripts) is committed here. The real `.env`
  was deliberately **not** committed; `.env.example` lists every variable it
  contained.
- **Two hardcoded Abacus paths removed** so the app builds anywhere:
  `prisma/schema.prisma` had `output = "/home/ubuntu/forwardone/nextjs_space/node_modules/.prisma/client"`
  on the generator, and `.yarnrc.yml` had `globalFolder: /opt/hostedapp/node/yarn/global`.
- **`prisma/schema.sql`** — the complete DDL (44 tables, 17 enums, all indexes
  and foreign keys) generated from the Prisma schema with
  `prisma migrate diff --from-empty --to-schema-datamodel … --script`. This
  lets you create an empty ForwardOne database on any Postgres without needing
  the Abacus one to be reachable.
- **Export/restore tooling** in `scripts/` (below).
- **`PROJECT_CONTEXT.md`** — the project brief/spec that lived in the Abacus
  workspace, kept as documentation.

## Getting the data out — the steps you have to run

The Claude sandbox cannot reach either the Abacus database or Abacus's S3
bucket: the DB host resolves but every TCP connection to `:5432` times out at
the egress proxy (verified), and the bucket is authenticated through
`AWS_PROFILE=hosted`, a credential profile that only exists inside Abacus's own
runtime. So these two steps have to be run by you — the first from any normal
machine, the second from inside the Abacus app.

**1. Database — from your own machine** (needs `postgresql-client` for
`pg_dump`/`psql`, and the exported `.env` in this directory):

```bash
cd forwardone
./scripts/export-abacus-db.sh
```

Writes `abacus-export/` (gitignored): a custom-format dump, the same thing as
plain SQL, a data-only SQL file, and per-table row counts.

**2. Uploaded files — from the Abacus app's shell**, while the Abacus project
still exists:

```bash
node scripts/export-abacus-files.mjs --list   # see what is there first
node scripts/export-abacus-files.mjs          # download into ./abacus-files
```

Then download `abacus-files/` (including its `manifest.json`, which maps every
`cloud_storage_path` in the database to the downloaded file) out of Abacus.
Cross-check that nothing referenced is missing:

```bash
psql "$DATABASE_URL" -f scripts/file-references.sql
```

**3. Load into a database you own** (Neon works well — that is where Elev8's
database went):

```bash
./scripts/restore-to-new-db.sh "postgres://…your new database…"
# or, to build the schema from prisma/schema.sql and load data separately:
./scripts/restore-to-new-db.sh "postgres://…" --data-only
```

The script prints row counts at the end — compare them with
`abacus-export/row-counts.txt` before pointing anything at the new database.

**4. Re-upload the files to your own bucket** and rewrite the paths. Elev8
already has a bucket (`elev8wear-uploads`, `eu-north-1`); ForwardOne should get
its own so the two apps' documents stay separated. After uploading, update
`cloud_storage_path` in `quote_files`, `shipment_documents` and
`tariff_import_jobs` from the manifest — the prefix changes, the file names do
not.

## Still on Abacus after the data is out (code-level, not data)

None of these block getting the data, but the app cannot run off Abacus until
they are replaced. Elev8 hit exactly the same list:

- **Email** — `lib/email.ts` posts to `apps.abacus.ai/api/sendNotificationEmail`
  with `ABACUSAI_API_KEY`, `WEB_APP_ID` and the five `NOTIF_ID_*` templates.
  Elev8's fix was Resend; the same swap applies here (the templates themselves
  are plain HTML in this file and carry over unchanged).
- **PDF generation** — `app/api/generate-pdf/route.ts` and
  `app/api/generate-pdf/status/route.ts` call Abacus's HTML→PDF service.
  Replace with a local renderer (Puppeteer/Playwright, already available) or a
  PDF API.
- **AI assistant** — `app/api/ai/assistant/route.ts` calls
  `apps.abacus.ai/v1/chat/completions` with `ABACUSAI_API_KEY`. Point at
  whichever model provider you want to keep using.
- **Chat/editor widget** — `app/layout.tsx` loads
  `apps.abacus.ai/chatllm/appllm-lib.js`. That is Abacus's in-builder
  assistant, not a customer-facing feature; delete the tag.
- **Client-error reporter** — `next.config.js` injects a webpack entry that
  beacons browser errors to `/__abacus/client-error`, an endpoint that only
  exists on Abacus hosting. Dead weight off Abacus; remove that webpack block.
- **File storage** — `lib/aws-config.ts` builds `new S3Client({})` with no
  explicit credentials, relying on Abacus's ambient `AWS_PROFILE=hosted`. On
  your own infrastructure, pass `S3_REGION` / `S3_ACCESS_KEY_ID` /
  `S3_SECRET_ACCESS_KEY` explicitly — and do not use the `AWS_*` names on
  Vercel, they are reserved on its Lambda runtime and silently overridden
  (this is what broke Elev8's uploads in production).

## Rotate the secrets

The exported `.env` carried live credentials: the Abacus database password,
`NEXTAUTH_SECRET`, and `ABACUSAI_API_KEY`. They were not committed, but they
travelled through a downloaded zip — treat them as exposed. Generate a fresh
`NEXTAUTH_SECRET` for the new deployment (`openssl rand -base64 32`); the
database password and Abacus key become moot once the app no longer uses
Abacus's database or API, as long as they are not reused anywhere else.
