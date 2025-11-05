#!/usr/bin/env node
// Run CONCURRENTLY index statements one-by-one using node pg client
const fs = require('fs');
const path = require('path');
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

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'psql_create_concurrent_indexes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split into statements by semicolon (safe here since file contains simple CREATE INDEX statements)
    const statements = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);

    for (const stmt of statements) {
      try {
        log.info('Executing:', stmt.replace(/\s+/g, ' ').slice(0, 80) + '...');
        await pool.query(stmt + ';');
        log.info('  OK');
      } catch (err) {
        log.error('  FAILED:', err.message);
      }
    }

    await pool.end();
    log.info('Done running concurrent index statements.');
  } catch (err) {
    log.error('Script failed:', err.message);
    process.exit(1);
  }
}

run();
