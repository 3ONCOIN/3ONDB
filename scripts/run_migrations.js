#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const log = require('../lib/cli-logger.js');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || process.env.PGUSER || 'postgres',
  host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
  database: process.env.DB_NAME || process.env.PGDATABASE || '3ONDB',
  // Prefer explicit DB_PASSWORD or PGPASSWORD/POSTGRES_PASSWORD; avoid committing literal fallbacks
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
});
const { execSync } = require('child_process');

async function ensureMigrationsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS migrations_applied (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      checksum VARCHAR(128)
    );
  `;
  await pool.query(sql);
}

async function getAppliedMigrations() {
  const res = await pool.query('SELECT migration_name, checksum FROM migrations_applied');
  const map = new Map();
  res.rows.forEach(r => map.set(r.migration_name, r.checksum));
  return map;
}

async function applyMigration(filePath, name) {
  const content = await fs.readFile(filePath, 'utf8');
  const checksum = crypto.createHash('sha256').update(content).digest('hex');

  log.info(`Applying migration: ${name}`);
  try {
    await pool.query(content);
    await pool.query('INSERT INTO migrations_applied (migration_name, checksum) VALUES ($1, $2) ON CONFLICT (migration_name) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = NOW()', [name, checksum]);
    log.info(`  Applied: ${name}`);
  } catch (err) {
    log.error(`  Failed to apply ${name}:`, err.message);
    throw err;
  }
}

async function run() {
  try {
    // Support a local-only checksum verification mode that doesn't require DB access.
    if (process.argv.includes('--check-local')) {
      const manifestPath = path.join(__dirname, '..', 'migrations', 'checksums.json');
      const manifestRaw = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestRaw);

      const migrationsDir = path.join(__dirname, '../migrations/pg');
      const files = (await fs.readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();
      const current = {};
      for (const f of files) {
        const content = await fs.readFile(path.join(migrationsDir, f), 'utf8');
        current[f] = crypto.createHash('sha256').update(content).digest('hex');
      }

      const mismatches = [];
      const missing = [];
      const added = [];
      // Check for changed or missing files
      for (const [name, ch] of Object.entries(manifest)) {
        if (!current[name]) {
          missing.push(name);
        } else if (current[name] !== ch) {
          mismatches.push(name);
        }
      }
      for (const name of Object.keys(current)) {
        if (!manifest[name]) added.push(name);
      }

      if (mismatches.length || missing.length || added.length) {
        if (mismatches.length) log.error('Changed migrations:', mismatches.join(', '));
        if (missing.length) log.error('Missing migrations from repo:', missing.join(', '));
        if (added.length) log.error('New migrations detected (not in manifest):', added.join(', '));
        process.exit(2);
      }

      log.info('Local checksum manifest verification passed.');
      process.exit(0);
    }
    const mismatches = [];
    await ensureMigrationsTable();
    const applied = await getAppliedMigrations();

    const migrationsDir = path.join(__dirname, '../migrations/pg');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    for (const file of sqlFiles) {
      const content = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(content).digest('hex');

      if (process.argv.includes('--check-only')) {
        // In check-only mode, verify checksums of applied migrations and report mismatches
        if (applied.has(file)) {
          const appliedChecksum = applied.get(file);
          if (appliedChecksum && appliedChecksum !== checksum) {
            log.error(`Checksum mismatch for applied migration ${file}. File has changed since it was applied.`);
            mismatches.push(file);
          }
        }
        // do not apply anything in check-only mode
        continue;
      }

      if (process.argv.includes('--force')) {
        // when force is provided, skip checksum validation and apply if not applied
        if (applied.has(file)) {
          log.info(`Skipping already applied: ${file}`);
          continue;
        }
      } else {
        if (applied.has(file)) {
          const appliedChecksum = applied.get(file);
          if (appliedChecksum && appliedChecksum !== checksum) {
            // Fail fast - migration file changed after being applied
            throw new Error(`Checksum mismatch for applied migration ${file}. File has changed since it was applied.`);
          }
          log.info(`Skipping already applied: ${file}`);
          continue;
        }
      }

      const fullPath = path.join(migrationsDir, file);
      if (process.argv.includes('--psql')) {
        // Run the migration file using psql (external command) so statements that must run outside transactions succeed
        const host = process.env.DB_HOST || process.env.PGHOST || 'localhost';
        const port = process.env.DB_PORT || process.env.PGPORT || '5432';
        const user = process.env.DB_USER || process.env.PGUSER || 'postgres';
        const database = process.env.DB_NAME || process.env.PGDATABASE || '3ONDB';
        const password = process.env.DB_PASSWORD || process.env.PGPASSWORD || '';

        const env = Object.assign({}, process.env);
        if (password) env.PGPASSWORD = password;

        const cmd = `psql -h ${host} -p ${port} -U ${user} -d ${database} -f "${fullPath}"`;
        log.info('Running via psql:', file);
        try {
          execSync(cmd, { stdio: 'inherit', env });
        } catch (err) {
          throw new Error(`psql failed for ${file}: ${err.message}`);
        }
      } else {
        await applyMigration(fullPath, file);
      }
    }

    if (process.argv.includes('--check-only')) {
      if (mismatches.length > 0) {
        log.error('Checksum mismatches detected for applied migrations:', mismatches.join(', '));
        process.exit(2);
      }
      log.info('Checksum verification completed — no mismatches detected.');
    } else {
      log.info('All migrations applied.');
    }
  } catch (err) {
    log.error('Migration runner failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
