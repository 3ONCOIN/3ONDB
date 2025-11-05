# 3ONDB Migration and Productionization Plan

This document outlines a concrete plan to move `3ONDB` from the current SQLite-based prototype to a production-ready database layer (Postgres PoC -> production), plus considerations if you choose to build a custom DB engine later.

## Goals
- Provide backward-compatible data access for existing services.
- Create a migration path from SQLite to Postgres with minimal downtime.
- Implement basic HA (replication) and scalability primitives for initial production.

## High-level choices
1. Postgres PoC (recommended first step)
   - Mature, battle-tested, supports replication, partitioning, and extensions.
   - Many libraries and tools for migration, backup, and monitoring.
2. Custom DB engine (long-term)
   - Only consider after running substantial production workloads and having strong reasons.
   - Will require years and dedicated infrastructure engineering to reach parity.

## Phase 0 — Preparation
- Inventory current schema and access patterns in `data/3onprime.db` and code that depends on SQLite.
- Add feature flags to the codebase to toggle between SQLite and Postgres data access (repository pattern).
- Identify critical tables: `users`, `files`, `buckets`, `share_tokens`, etc.
- Create a Docker Compose environment for local Postgres testing.

## Phase 1 — Postgres PoC (2-4 weeks)
1. Stand up Postgres in Docker Compose
   - Use `postgres:15` image with example `POSTGRES_PASSWORD`/`POSTGRES_USER`.
2. Create schemas matching current SQLite tables (DDL scripts in `migrations/pg/`)
3. Implement a small migration tool:
   - An export from SQLite to CSV or direct migration using node script that reads rows and inserts them into Postgres.
4. Add Postgres adapter to `models/User.js` and a `db/pg.js` helper to manage pooled connections (use `pg` package). Add `DB_BACKEND` env var to select backend.
5. Run PoC: start services pointing to Postgres and validate application flows (auth, file metadata, uploads).
6. Add tests for critical flows and performance checks.

## Phase 2 — Hardening & HA (4-8 weeks)
1. Replication
   - Add streaming replication with a standby replica.
2. Backups & PITR
   - Configure base backups and WAL archiving for point-in-time recovery.
3. Monitoring
   - Integrate Prometheus + Grafana or other monitoring, add alerts for replication lag and resource usage.
4. Performance
   - Add indices, analyze slow queries, and add connection pooling (pg-pool).
5. Partitioning & sharding plan
   - Plan partitioning strategies for large tables (time-based for logs/backups; hash-based for user data) and test.

## Phase 3 — Scalability & Global Deployment (ongoing)
- Introduce read replicas for analytics and geo-distribution if needed.
- Add caching (Redis) for hot lookups.
- Introduce sharding proxy (Citus or custom sharding) if single-DB limits are reached.

## Rollback & Risk Mitigation
- Always take snapshots/backups before migration.
- Use blue-green or canary migration patterns for production.
- Keep SQLite read-only fallback in code for quick fallback (if necessary).

## Minimal PoC checklist (commands)
- Start Postgres locally via Docker Compose (create `docker-compose.pg.yml`):

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: pguser
   POSTGRES_PASSWORD: REPLACE_ME
      POSTGRES_DB: 3onprime
    ports:
      - '5432:5432'
    volumes:
      - ./data/pg:/var/lib/postgresql/data
```

- Create migrations directory and add DDLs for `users`, `files`, `buckets`, `share_tokens`.
- Run simple migration script:

```bash
# export from sqlite to csv and import into postgres (example)
sqlite3 data/3onprime.db \
  -header -csv "SELECT * FROM users;" > /tmp/users.csv
psql postgresql://pguser:REPLACE_ME@localhost:5432/3onprime -c "\copy users FROM '/tmp/users.csv' CSV HEADER;"
```

- Start server pointing at Postgres by setting `DB_BACKEND=pg` and adding a small Postgres adapter in `models/`.

## Implementation notes and code pointers
- Add `db/pg.js` for pooled connections using `pg.Pool`.
- Use parameterized queries to avoid SQL injection.
- Keep existing `models/*.js` implementations but add a Postgres code path.
- Add `migrations/` and a small CLI `scripts/db_migrate.js` to run DDLs.

## Testing
- Add integration tests that run against the Docker Compose Postgres.
- Add performance tests for queries and bulk loads (artillery for HTTP endpoints where relevant).

## Staffing & Timeline
- Small team (2-4 engineers) can produce a Postgres PoC in 2-4 weeks.
- Production-ready, HA, and scaling features will require 2-3 months and SRE support.
- Custom DB engine is a multi-year effort.

## Next steps (actions I can take automatically)
- Scaffold `docker-compose.pg.yml` and `db/pg.js` connection helper.
- Create Postgres DDL migration files for core tables and a `scripts/db_migrate.js` to run them.
- Implement a migration script to transfer data from SQLite to Postgres.

If you'd like me to proceed automatically, tell me which next step to run now and I'll implement and test it.