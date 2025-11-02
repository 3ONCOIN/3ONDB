const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const dotenv = require('dotenv');
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

dotenv.config();

// SQLite database path
const sqliteDbPath = './data/3on.sqlite';

// PostgreSQL connection configuration
const pgConfig = {
  user: process.env.PG_USER || 'pguser',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || '3onprime',
  // Prefer explicit PG_PASSWORD or POSTGRES_PASSWORD and avoid a hard-coded default
  password: process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD || '',
  port: process.env.PG_PORT || 5432,
};

// Migrate data from SQLite to PostgreSQL
async function migrateData() {
  const sqliteDb = new sqlite3.Database(sqliteDbPath);
  const pgClient = new Client(pgConfig);

  try {
    await pgClient.connect();

    // Fetch all table names from SQLite
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table'", async (err, tables) => {
      if (err) throw err;

      for (const table of tables) {
        const tableName = table.name;
        logger.info(`Migrating table: ${tableName}`);

        // Fetch all rows from the current table
        sqliteDb.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
          if (err) throw err;

          for (const row of rows) {
            // Dynamically generate column names and values
            const columns = Object.keys(row);
            const values = Object.values(row);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

            const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

            try {
              await pgClient.query(query, values);
            } catch (error) {
              logger.error(`Failed to migrate row in table ${tableName}:`, error);
            }
          }

          logger.info(`Table ${tableName} migrated successfully.`);
        });
      }
    });
  } catch (error) {
    logger.error('Migration failed:', error);
  } finally {
    sqliteDb.close();
    await pgClient.end();
  }
}

migrateData();