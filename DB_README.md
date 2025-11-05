Local Postgres (development) — quick start

Connection details (local dev using docker-compose.pg.yml):

- Host: 127.0.0.1
- Port: 5433 (container mapped to host 5433 to avoid collisions)
- Database: 3onprime
- User: pguser
 - Password: REPLACE_ME

Commands to manage locally:

Start Postgres:
```bash
docker-compose -f docker-compose.pg.yml up -d
```

Run migrations (from project root):
```bash
# from host
PGHOST=127.0.0.1 PGUSER=pguser PGPASSWORD=REPLACE_ME PGDATABASE=3onprime PGPORT=5433 node scripts/run_migrations.js

# or from node container on same network
docker run --rm -v "$(pwd)":/work -w /work --network 3onprime_default node:18 bash -lc "npm ci --silent && PGHOST=postgres PGUSER=pguser PGPASSWORD=REPLACE_ME PGDATABASE=3onprime node scripts/run_migrations.js"
```

Create admin user (CLI):
```bash
DB_HOST=127.0.0.1 DB_USER=pguser DB_PASSWORD=REPLACE_ME DB_NAME=3onprime DB_PORT=5433 node apps/3oncloud/cli/quantum-cli.js user create --email admin@localhost --name Admin --role admin
```

Notes:
- If your host already runs Postgres on 5432, this compose file maps container port to 5433 to avoid conflicts. To use 5432, stop your local Postgres and update `docker-compose.pg.yml`.
- For CI, set `FILE_ENCRYPTION_KEY` in repository secrets. Tests will otherwise use a fallback key.

Backups & password rotation

- Create a gzipped SQL backup (defaults to local compose mapping):
```bash
# from host (uses .env or env vars)
DB_HOST=127.0.0.1 DB_PORT=5433 DB_USER=pguser DB_PASSWORD=REPLACE_ME DB_NAME=3onprime ./scripts/db_backup.sh
```

- Rotate admin password and store encrypted copy:
```bash
# This will update the admin password and write an encrypted file under backups/.
# The script prints a vault passphrase which you must store.
docker run --rm -v "$(pwd)":/work -w /work --network 3onprime_default node:18 bash -lc "npm ci --silent && DB_HOST=postgres DB_USER=pguser DB_PASSWORD=REPLACE_ME DB_NAME=3onprime node scripts/rotate_admin_password.js"
```

