#!/usr/bin/env bash
set -euo pipefail

# Create backups dir
mkdir -p backups

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
OUT=backups/db_backup_${TIMESTAMP}.sql.gz

# Defaults (can be overridden by env vars)
PGHOST=${DB_HOST:-127.0.0.1}
PGPORT=${DB_PORT:-5433}
PGUSER=${DB_USER:-pguser}
# Prefer DB_PASSWORD or POSTGRES_PASSWORD; avoid hard-coded default
PGPASSWORD=${DB_PASSWORD:-${POSTGRES_PASSWORD:-}}
PGDATABASE=${DB_NAME:-3onprime}

export PGPASSWORD

echo "Creating DB dump to ${OUT} (host=${PGHOST} port=${PGPORT} user=${PGUSER} db=${PGDATABASE})"
pg_dump -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" | gzip > "${OUT}"

echo "Backup completed: ${OUT}"
