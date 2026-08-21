// Download every file ForwardOne stored in Abacus's S3 bucket.
//
// Uploaded documents (quote attachments, shipment documents, saved business
// documents) live in Abacus's *shared* bucket under our own folder prefix:
//   bucket = AWS_BUCKET_NAME, prefix = AWS_FOLDER_PREFIX  (see .env)
// The database only stores the key (`cloud_storage_path`), never the bytes —
// so a database dump alone does NOT get you the files.
//
// Credentials: the Abacus runtime authenticates through AWS_PROFILE=hosted,
// which only exists inside Abacus's own environment. So run this THERE — in the
// Abacus app's shell, from the app directory, while the project still exists:
//
//   node scripts/export-abacus-files.mjs            # download everything
//   node scripts/export-abacus-files.mjs --list     # just list keys + sizes
//
// Output: ./abacus-files/<key-without-prefix> plus manifest.json mapping the
// original cloud_storage_path to the local file, so the rows can be rewritten
// after the files are re-uploaded to your own bucket.
import { readFileSync, mkdirSync, writeFileSync, createWriteStream, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'

// Minimal .env loader — no dependency on dotenv being installed.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const Bucket = process.env.AWS_BUCKET_NAME
const prefix = process.env.AWS_FOLDER_PREFIX ?? ''
if (!Bucket) {
  console.error('AWS_BUCKET_NAME is not set. Run this inside the Abacus app directory, where .env still has it.')
  process.exit(1)
}

const listOnly = process.argv.includes('--list')
const outDir = 'abacus-files'
const client = new S3Client({})

const objects = []
let ContinuationToken
do {
  const page = await client.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken }))
  for (const o of page.Contents ?? []) objects.push({ key: o.Key, size: o.Size, modified: o.LastModified })
  ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
} while (ContinuationToken)

const total = objects.reduce((n, o) => n + (o.size ?? 0), 0)
console.log(`${objects.length} objects under s3://${Bucket}/${prefix} (${(total / 1024 / 1024).toFixed(1)} MB)`)

if (listOnly) {
  for (const o of objects) console.log(`${String(o.size).padStart(10)}  ${o.key}`)
  process.exit(0)
}

const manifest = []
let done = 0
for (const o of objects) {
  const relative = o.key.startsWith(prefix) ? o.key.slice(prefix.length) : o.key
  const local = join(outDir, relative)
  mkdirSync(dirname(local), { recursive: true })
  const res = await client.send(new GetObjectCommand({ Bucket, Key: o.key }))
  await pipeline(res.Body, createWriteStream(local))
  manifest.push({ cloud_storage_path: o.key, local: relative, size: o.size, contentType: res.ContentType ?? null, modified: o.modified })
  done++
  if (done % 25 === 0 || done === objects.length) console.log(`  downloaded ${done}/${objects.length}`)
}

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`\nDone. Files in ./${outDir}, manifest at ./${outDir}/manifest.json`)
console.log('Keep the manifest: it maps every DB cloud_storage_path to the downloaded file.')
