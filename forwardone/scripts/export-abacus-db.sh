#!/usr/bin/env bash
# Dump the ForwardOne database that still lives on Abacus.AI's hosted Postgres.
#
# Run this from a machine that can actually reach the Abacus DB host
# (db-*.hosteddb.reai.io:5432) — a normal laptop on the internet can, the
# Claude sandbox cannot (its egress proxy blocks raw Postgres).
#
#   ./scripts/export-abacus-db.sh                 # reads DATABASE_URL from .env
#   ./scripts/export-abacus-db.sh "postgres://…"  # or pass it explicitly
#
# Produces, in ./abacus-export/:
#   forwardone.dump      full custom-format dump (schema + data) — restore with pg_restore
#   forwardone.sql       same thing as plain SQL, readable/greppable
#   data-only.sql        data without DDL, for loading into a DB created from prisma/schema.sql
#   row-counts.txt       per-table row counts, to verify the restore matched
set -euo pipefail

cd "$(dirname "$0")/.."

URL="${1:-}"
if [ -z "$URL" ] && [ -f .env ]; then
  URL="$(grep -E "^DATABASE_URL=" .env | head -1 | cut -d= -f2- | tr -d "'\"")"
fi
if [ -z "$URL" ]; then
  echo "No DATABASE_URL. Pass it as an argument or put it in forwardone/.env" >&2
  exit 1
fi

command -v pg_dump >/dev/null || { echo "pg_dump not installed (brew install libpq / apt install postgresql-client)" >&2; exit 1; }

OUT=abacus-export
mkdir -p "$OUT"

echo "==> Dumping schema + data (custom format)"
pg_dump "$URL" --no-owner --no-privileges --format=custom --file="$OUT/forwardone.dump"

echo "==> Dumping schema + data (plain SQL)"
pg_dump "$URL" --no-owner --no-privileges --format=plain --file="$OUT/forwardone.sql"

echo "==> Dumping data only"
pg_dump "$URL" --no-owner --no-privileges --data-only --disable-triggers --format=plain --file="$OUT/data-only.sql"

echo "==> Counting rows"
psql "$URL" -At -F' ' -o "$OUT/row-counts.txt" <<'SQL'
SELECT relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC, relname;
SQL

echo
echo "Done. Files in $(pwd)/$OUT:"
ls -lh "$OUT"
echo
echo "Row counts (verify these again after restoring into the new database):"
cat "$OUT/row-counts.txt"
