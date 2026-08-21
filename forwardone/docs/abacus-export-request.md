# Prompt to give the Abacus builder (ForwardOne project)

Copy everything between the lines into the ForwardOne project on Abacus.
It asks for an export only — no schema changes, no rebuild, nothing deleted.
The output you care about is the list of presigned URLs it prints at the end:
those work from your own machine for 7 days, which is how the files get out.

---

Continue from the EXISTING ForwardOne project. This is an EXPORT-ONLY task.

Do NOT rebuild the application.
Do NOT change the Prisma schema, do NOT run migrations, do NOT modify any
existing route, component, or business logic.
Do NOT delete anything from S3 or from the database.
Everything below is additive and read-only: new scripts under `scripts/`, and
one new folder `export/`.

## Why

I am moving ForwardOne off Abacus. I already have the source code and the
database schema. What I cannot reach from outside is the file storage: the
uploaded documents live in the shared bucket `AWS_BUCKET_NAME` under
`AWS_FOLDER_PREFIX`, authenticated through `AWS_PROFILE=hosted`, which only
works inside this runtime. The database stores only `cloud_storage_path`, never
the bytes. So I need the files, and a full data export, in a form I can
download from my own machine.

## Deliverable 1 — file inventory + presigned download manifest

Add `scripts/export-files-manifest.ts` (runnable with `npx tsx`) that:

- Lists EVERY object under `${AWS_FOLDER_PREFIX}` in `${AWS_BUCKET_NAME}` using
  `ListObjectsV2`, paginating until `IsTruncated` is false. Do not stop at the
  first 1000 keys.
- For each object, generates a presigned GET URL with
  `@aws-sdk/s3-request-presigner`, `expiresIn: 604800` (7 days — the SigV4
  maximum).
- Writes `export/files-manifest.json`: an array of
  `{ key, size, lastModified, contentType, url }`.
- Writes `export/download-all.sh`: a plain bash script that recreates the
  folder structure locally and fetches every file with
  `curl -fL --create-dirs -o "<path-relative-to-prefix>" "<url>"`.
- Prints the total object count and total size in MB.

## Deliverable 2 — cross-check against the database

Query the three tables that reference storage — `quote_files`,
`shipment_documents`, `tariff_import_jobs` (columns `cloud_storage_path`,
`file_name`, `created_at`) — and write `export/db-file-references.json`.

Then report two lists explicitly:
- referenced keys that do NOT exist in the bucket (documents that would be lost)
- objects in the bucket that no row references (orphans)

## Deliverable 3 — full database export

Add `scripts/export-db.ts`:

- If `pg_dump` is available in this container: run
  `pg_dump "$DATABASE_URL" --no-owner --no-privileges --format=custom
  --file=export/forwardone.dump`, and also a plain data-only SQL file.
- If `pg_dump` is NOT available: fall back to a Prisma-based dump — for every
  table in the schema, `SELECT *` and write NDJSON to
  `export/tables/<table>.ndjson`. Serialize `Decimal` as a string, dates as ISO
  8601, `Json` columns as-is. Order rows by primary key (or `created_at`) so
  the output is stable.
- Either way, write `export/row-counts.json` with a row count per table.
- Export ALL tables, including the geo/reference ones (`countries`, `regions`,
  `cities`, `postal_codes`, `package_types`, `currencies`) and the tariff
  tables — those took real work to import and I am not re-importing them.

## Deliverable 4 — get the export off Abacus

Upload the `export/` folder itself back to the bucket under
`${AWS_FOLDER_PREFIX}exports/<timestamp>/`, then print presigned URLs (7 days)
for:

- `files-manifest.json`
- `download-all.sh`
- `db-file-references.json`
- the database dump (tar.gz the NDJSON folder first if you used the fallback)

Print those URLs in the chat as the final output. That is what I take away.

## Constraints

- Read-only against S3 and Postgres. No `DeleteObject`, no writes to any
  application table. The only `PutObject` allowed is the `export/` folder from
  Deliverable 4.
- Never print `AWS_ACCESS_KEY_ID`/secrets, `DATABASE_URL`, `NEXTAUTH_SECRET` or
  `ABACUSAI_API_KEY`. Presigned URLs are fine — they carry a signature, not the
  key.
- If the bucket prefix holds more than ~2 GB, tell me the size first and wait —
  do not try to zip it all.
- Use the dependencies already installed (`@aws-sdk/client-s3`,
  `@aws-sdk/s3-request-presigner`, `@prisma/client`, `tsx`). If you genuinely
  need a new package, say which and why before adding it.
- Finish with a summary: total objects, total bytes, per-table row counts, and
  the missing/orphan lists from Deliverable 2.

---

## Short version (if you just want the files)

> Export-only task, do not rebuild anything and do not change the schema. List
> every object under `AWS_FOLDER_PREFIX` in `AWS_BUCKET_NAME` (paginate past
> 1000 keys), generate a 7-day presigned GET URL for each, and give me a
> `files-manifest.json` plus a `download-all.sh` that curls them into the same
> folder structure. Also tell me the total count and size, and which
> `cloud_storage_path` values in `quote_files`, `shipment_documents` and
> `tariff_import_jobs` have no matching object in the bucket. Do not print any
> secret or the DATABASE_URL.
