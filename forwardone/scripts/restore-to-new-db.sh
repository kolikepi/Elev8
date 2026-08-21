#!/usr/bin/env bash
# Load the Abacus dump into a database you own (Neon, RDS, a local Postgres, …).
#
#   ./scripts/restore-to-new-db.sh "postgres://user:pass@new-host/db"
#
# Two modes:
#   - default: pg_restore of abacus-export/forwardone.dump (schema + data in one shot)
#   - --data-only: create the schema from prisma/schema.sql first, then load
#     abacus-export/data-only.sql. Use this if the target already has the schema,
#     or if the source dump's DDL fights with the target (e.g. extensions).
set -euo pipefail

cd "$(dirname "$0")/.."

TARGET="${1:-}"
MODE="${2:-full}"
[ -n "$TARGET" ] || { echo "usage: $0 <target-database-url> [--data-only]" >&2; exit 1; }

if [ "$MODE" = "--data-only" ]; then
  echo "==> Creating schema from prisma/schema.sql"
  psql "$TARGET" -v ON_ERROR_STOP=1 -f prisma/schema.sql
  echo "==> Loading data"
  psql "$TARGET" -v ON_ERROR_STOP=1 -f abacus-export/data-only.sql
else
  echo "==> Restoring abacus-export/forwardone.dump"
  pg_restore --no-owner --no-privileges --dbname "$TARGET" abacus-export/forwardone.dump
fi

echo "==> Row counts on the new database"
psql "$TARGET" -At -F' ' <<'SQL'
SELECT relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC, relname;
SQL
echo
echo "Compare against abacus-export/row-counts.txt before pointing the app at this database."
