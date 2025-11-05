#!/usr/bin/env bash
set -euo pipefail
PGHOST=${PGHOST:-localhost}
PGPORT=${PGPORT:-5432}
PGUSER=${PGUSER:-pguser}
# Prefer explicit PGPASSWORD then POSTGRES_PASSWORD; leave empty if none provided
PGPASSWORD=${PGPASSWORD:-${POSTGRES_PASSWORD:-}}
PGDATABASE=${PGDATABASE:-3onprime}

echo "Checking Postgres connectivity to $PGHOST:$PGPORT..."
if ! pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" >/dev/null 2>&1; then
  echo "Postgres not reachable. Export PGHOST/PGPORT/PGUSER/PGPASSWORD and retry or start Docker compose." >&2
  exit 2
fi

echo "Postgres reachable — running migration script"
node scripts/db_migrate_to_pg.js
