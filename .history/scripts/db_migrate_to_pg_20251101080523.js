#!/usr/bin/env node
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const log = require('../lib/cli-logger.js');

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = { dryRun: false, samples: 3 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run' || a === '-n') out.dryRun = true;
    else if (a.startsWith('--samples=')) out.samples = parseInt(a.split('=')[1], 10) || out.samples;
    else if (a === '--samples' && argv[i+1]) { out.samples = parseInt(argv[i+1], 10) || out.samples; i++; }
  }
  return out;
}

async function runDryRun(sqlitePath, tables, samples) {
  const sqlite = new sqlite3.Database(sqlitePath);
  log.info('[dry-run] Reading SQLite DB:', sqlitePath);
  for (const t of tables) {
    try {
      const count = await new Promise((res, rej) => sqlite.get(`SELECT COUNT(*) as c FROM ${t}`, [], (err, r) => err ? rej(err) : res(r && r.c ? r.c : 0)));
      log.info(`[dry-run] table=${t} count=${count}`);
      if (count > 0) {
        const samplesRows = await new Promise((res, rej) => sqlite.all(`SELECT * FROM ${t} LIMIT ${samples}`, [], (err, r) => err ? rej(err) : res(r)));
        for (let i = 0; i < samplesRows.length; i++) {
          log.info(`[dry-run] ${t} sample[${i}]:`, JSON.stringify(samplesRows[i]));
        }
      }
    } catch (e) {
      log.warning(`[dry-run] could not read table ${t}:`, e.message);
    }
  }
  sqlite.close();
  log.info('[dry-run] finished');
}

async function migrate() {
  const { dryRun, samples } = parseArgs();
  const sqlitePath = path.join(__dirname, '../data/3onprime.db');
  const tables = ['users','buckets','files','share_tokens'];

  if (!fs.existsSync(sqlitePath)) {
    log.error('SQLite DB not found at', sqlitePath);
    process.exit(1);
  }

  if (dryRun) {
    await runDryRun(sqlitePath, tables, samples);
    return;
  }

  // Non-dry-run: perform migration to Postgres
  const { Pool } = require('pg');
  const sqlite = new sqlite3.Database(sqlitePath);
  const pool = new Pool({
    user: process.env.PGUSER || 'pguser',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || '3onprime',
    // Prefer explicit PGPASSWORD, then POSTGRES_PASSWORD; avoid hard-coded fallbacks
    password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
    port: parseInt(process.env.PGPORT || '5432', 10)
  });

  await pool.connect();

  // Run DDL from migrations
  const ddl = fs.readFileSync(path.join(__dirname, '../migrations/pg/001-create-core-tables.sql'), 'utf8');
  await pool.query(ddl);

  for (const t of tables) {
    const rows = await new Promise((resolve, reject) => sqlite.all(`SELECT * FROM ${t}`, [], (err, r) => err ? reject(err) : resolve(r)));
    if (!rows || !rows.length) continue;
    // Build insert statement
    const cols = Object.keys(rows[0]);
    const placeholders = cols.map((_,i)=>`$${i+1}`).join(',');
    const insert = `INSERT INTO ${t} (${cols.join(',')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
    for (const row of rows) {
      const vals = cols.map(c => row[c]);
      try {
        await pool.query(insert, vals);
      } catch (e) {
        log.warning('Insert failed for', t, e.message);
      }
    }
  }

  await pool.end();
  sqlite.close();
  log.info('Migration complete');
}

if (require.main === module) migrate().catch(err=>{ log.error(err); process.exit(1); });
