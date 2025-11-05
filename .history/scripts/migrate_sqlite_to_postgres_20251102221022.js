const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const dotenv = require('dotenv');
const pino = require('pino');
const util = require('util');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

dotenv.config();

// SQLite database path
const sqliteDbPath = './data/3on.sqlite';

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

      // Fetch all rows from the current table using promised API
      let rows = [];
      try {
        rows = await sqliteAll(`SELECT * FROM ${tableName}`);
      } catch (err) {
        logger.error({ err }, `Failed to read rows from SQLite table ${tableName}`);
        continue;
      }

      for (const row of rows) {
        // Dynamically generate column names and values
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

        try {
          await pgClient.query(query, values);
        } catch (error) {
          // log full error object so we get stack and details in the log
          logger.error({ err: error, table: tableName, row: values }, `Failed to migrate row in table ${tableName}`);
        }
      }

      logger.info({ table: tableName, rowsMigrated: rows.length }, `Table ${tableName} migrated successfully.`);
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