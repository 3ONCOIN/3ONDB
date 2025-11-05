const { Pool } = require('pg');
const os = require('os');
const log = require('../lib/cli-logger.js');

// Production-friendly pool defaults. Tune with env vars when needed.
const DEFAULT_MAX = Math.min(Math.max(20, (os.cpus() ? os.cpus().length : 2) * 2), 100);
const POOL_MAX = parseInt(process.env.PG_MAX_POOL || process.env.PGPOOL_MAX || String(DEFAULT_MAX), 10);
const IDLE_TIMEOUT_MS = parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10);
const CONNECTION_TIMEOUT_MS = parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || '2000', 10);

const pool = new Pool({
  user: process.env.PGUSER || 'pguser',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || '3onprime',
  password: process.env.PG_PASSWORD || process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.PGPORT || '5432', 10),
  max: POOL_MAX,
  idleTimeoutMillis: IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: CONNECTION_TIMEOUT_MS
});

// Set a few session-level settings for each new client to improve stability under load.
pool.on('connect', async (client) => {
  try {
    // application_name helps with observability
    await client.query("SET application_name = '3onprime-app'");
    // limit long running statements by default (ms) - can be overridden per-session
    const stmtTimeout = parseInt(process.env.PG_STATEMENT_TIMEOUT_MS || '60000', 10);
    await client.query(`SET statement_timeout = ${stmtTimeout}`);
    // Optional: tune work_mem per session if desired
    const workMem = process.env.PG_WORK_MEM || '';
    if (workMem) await client.query(`SET work_mem = '${workMem}'`);
  } catch (err) {
    // ignore - best-effort
    log.warning('pg pool connect hook failed to set session params', err && err.message ? err.message : err);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
