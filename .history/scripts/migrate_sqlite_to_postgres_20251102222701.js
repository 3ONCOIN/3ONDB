const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const dotenv = require('dotenv');
const pino = require('pino');
const util = require('util');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

dotenv.config();

// SQLite database path (can be overridden with env var SQLITE_DB_PATH)
const sqliteDbPath = process.env.SQLITE_DB_PATH || './data/3on.sqlite';

// PostgreSQL connection configuration
const pgConfig = {
  user: process.env.PG_USER || process.env.PGUSER || 'pguser',
  host: process.env.PG_HOST || process.env.PGHOST || 'localhost',
  database: process.env.PG_DATABASE || process.env.PGDATABASE || '3onprime',
  // Prefer explicit PG_PASSWORD or POSTGRES_PASSWORD and avoid a hard-coded default
  password: process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || '',
  port: process.env.PG_PORT || process.env.PGPORT || 5432,
};

// Migrate data from SQLite to PostgreSQL
// CLI flags
const args = process.argv.slice(2);
const RECONCILE_ONLY = args.includes('--reconcile-only');

async function migrateData() {
  const sqliteDb = new sqlite3.Database(sqliteDbPath);
  const sqliteAll = util.promisify(sqliteDb.all).bind(sqliteDb);
  const pgClient = new Client(pgConfig);

  try {
    await pgClient.connect();

    // Fetch all table names from SQLite (exclude sqlite internal tables)
    const tables = await sqliteAll("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");

    if (!tables || tables.length === 0) {
      logger.warn('No tables found in SQLite database at ' + sqliteDbPath);
      return;
    }

    for (const table of tables) {
      const tableName = table.name;
      logger.info({ table: tableName }, `Migrating table: ${tableName}`);

      // Ensure target table exists in Postgres: if not, create it using sqlite schema
      try {
        const existsRes = await pgClient.query(`SELECT to_regclass($1) AS rel`, [tableName]);
        const exists = existsRes.rows && existsRes.rows[0] && existsRes.rows[0].rel;
        if (!exists) {
          // inspect sqlite schema for this table
          let cols = [];
          try {
            cols = await sqliteAll(`PRAGMA table_info(${tableName})`);
          } catch (err) {
            logger.error({ err, table: tableName }, `Failed to read PRAGMA table_info for ${tableName}`);
          }

          if (cols && cols.length > 0) {
            // build CREATE TABLE statement
            const colDefs = cols.map(c => {
              const name = c.name;
              const type = (c.type || '').toUpperCase();
              // map sqlite types to Postgres
              let pgType = 'text';
              if (/INT/.test(type)) pgType = 'integer';
              else if (/CHAR|CLOB|TEXT/.test(type)) pgType = 'text';
              else if (/BLOB/.test(type)) pgType = 'bytea';
              else if (/REAL|FLOA|DOUB/.test(type)) pgType = 'double precision';
              else if (/NUMERIC|DECIMAL/.test(type)) pgType = 'numeric';

              const notnull = c.notnull ? 'NOT NULL' : '';
              const pk = c.pk ? 'PRIMARY KEY' : '';
              // Avoid adding AUTOINCREMENT handling; assume integer PKs map to serial if desired later
              return `"${name}" ${pgType} ${notnull} ${pk}`.trim();
            }).join(', ');

            const createSql = `CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs})`;
            try {
              await pgClient.query(createSql);
              logger.info({ table: tableName }, `Created missing Postgres table ${tableName}`);
            } catch (err) {
              logger.error({ err, table: tableName, sql: createSql }, `Failed to create table ${tableName} in Postgres`);
            }
          } else {
            logger.warn({ table: tableName }, `No column info found for ${tableName}; skipping create`);
          }
        }
      } catch (err) {
        logger.error({ err, table: tableName }, `Error checking/creating table ${tableName}`);
      }

      // Fetch all rows from the current table using promised API
      let rows = [];
      try {
        rows = await sqliteAll(`SELECT * FROM ${tableName}`);
      } catch (err) {
        logger.error({ err }, `Failed to read rows from SQLite table ${tableName}`);
        continue;
      }

      if (!RECONCILE_ONLY) {
        for (const row of rows) {
          // Dynamically generate column names and values
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

          const query = `INSERT INTO ${tableName} (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

          try {
            await pgClient.query(query, values);
          } catch (error) {
            // log full error object so we get stack and details in the log
            logger.error({ err: error, table: tableName, row: values }, `Failed to migrate row in table ${tableName}`);
          }
        }

        logger.info({ table: tableName, rowsMigrated: rows.length }, `Table ${tableName} migrated successfully.`);
      } else {
        logger.info({ table: tableName, rowsFound: rows.length }, `Reconcile-only: found ${rows.length} rows for ${tableName}`);
      }
    }
    // After processing all tables: reconciliation and optional sequence fixup
    const reconciliation = [];
    for (const table of tables) {
      const tableName = table.name;
      let sqliteCount = 0;
      try {
        const r = await sqliteAll(`SELECT COUNT(*) as c FROM ${tableName}`);
        sqliteCount = r && r[0] ? r[0].c : 0;
      } catch (e) {
        logger.warn({ e, table: tableName }, `Could not count rows in sqlite for ${tableName}`);
      }

      let pgCount = 0;
      try {
        const r2 = await pgClient.query(`SELECT COUNT(*)::int as c FROM "${tableName}"`);
        pgCount = r2.rows && r2.rows[0] ? r2.rows[0].c : 0;
      } catch (e) {
        logger.warn({ e, table: tableName }, `Could not count rows in postgres for ${tableName}`);
      }

      reconciliation.push({ table: tableName, sqlite_count: sqliteCount, pg_count: pgCount });

      // Sequence fixup: if table has a single integer PK, create/advance sequence and set default
      try {
        const cols = await sqliteAll(`PRAGMA table_info(${tableName})`);
        const pkCol = cols && cols.find(c => c.pk === 1);
        if (pkCol) {
          const pkName = pkCol.name;
          const pkType = (pkCol.type || '').toUpperCase();
          if (/INT/.test(pkType)) {
            const seqName = `seq_${tableName}_${pkName}`;
            try {
              await pgClient.query(`CREATE SEQUENCE IF NOT EXISTS "${seqName}"`);
              const maxRes = await pgClient.query(`SELECT COALESCE(MAX("${pkName}"),0) as m FROM "${tableName}"`);
              const maxVal = maxRes.rows && maxRes.rows[0] ? maxRes.rows[0].m : 0;
              await pgClient.query(`SELECT setval('"${seqName}"', $1, true)`, [maxVal]);
              // set default on column to nextval of sequence
              await pgClient.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${pkName}" SET DEFAULT nextval('"${seqName}"')`);
              logger.info({ table: tableName, pk: pkName, seq: seqName, max: maxVal }, `Sequence ${seqName} created and set for ${tableName}.${pkName}`);
            } catch (e) {
              logger.warn({ e, table: tableName, pk: pkName }, `Failed to create/set sequence for ${tableName}.${pkName}`);
            }
          }
        }
      } catch (e) {
        logger.warn({ e, table: tableName }, `Error during sequence fixup for ${tableName}`);
      }
    }

    // write reconciliation CSV to backups
    try {
      const csvLines = ['table,sqlite_count,pg_count'];
      for (const r of reconciliation) csvLines.push(`${r.table},${r.sqlite_count},${r.pg_count}`);
      const fs = require('fs');
      const path = require('path');
      const outDir = path.resolve(process.cwd(), 'backups');
      fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, `reconciliation-${Date.now()}.csv`);
      fs.writeFileSync(outPath, csvLines.join('\n'));
      logger.info({ outPath }, 'Wrote reconciliation CSV');
    } catch (e) {
      logger.warn({ e }, 'Failed to write reconciliation CSV');
    }

  } catch (error) {
    // ensure the full error object/stack is logged
    logger.error({ err: error }, 'Migration failed:');
  } finally {
    try {
      sqliteDb.close();
    } catch (e) {
      logger.warn({ e }, 'Error closing sqlite DB');
    }
    try {
      await pgClient.end();
    } catch (e) {
      logger.warn({ e }, 'Error closing pg client');
    }
  }
}

migrateData();