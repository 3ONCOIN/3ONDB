const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

class SQLiteConnection {
  constructor() {
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        // Ensure directory exists
        const dbDir = path.dirname(config.sqlite.filename);
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new sqlite3.Database(config.sqlite.filename, (err) => {
          if (err) {
            logger.error('Failed to connect to SQLite:', err);
            reject(err);
          } else {
            logger.info('SQLite connected successfully');
            this.initializeTables()
              .then(resolve)
              .catch(reject);
          }
        });
      } catch (error) {
        logger.error('SQLite connection error:', error);
        reject(error);
      }
    });
  }

  async initializeTables() {
    try {
      // Enable foreign keys
      await this.run('PRAGMA foreign_keys = ON');

      // Create users table
      await this.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_login TEXT,
          is_active INTEGER DEFAULT 1,
          metadata TEXT DEFAULT '{}'
        )
      `);

      // Create query_logs table
      await this.run(`
        CREATE TABLE IF NOT EXISTS query_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          query_text TEXT NOT NULL,
          query_type TEXT,
          execution_time_ms INTEGER,
          status TEXT,
          error_message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          metadata TEXT DEFAULT '{}',
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Create data_health table
      await this.run(`
        CREATE TABLE IF NOT EXISTS data_health (
          id TEXT PRIMARY KEY,
          table_name TEXT NOT NULL,
          check_type TEXT,
          status TEXT,
          issues_found INTEGER DEFAULT 0,
          issues_fixed INTEGER DEFAULT 0,
          details TEXT DEFAULT '{}',
          checked_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create sync_status table
      await this.run(`
        CREATE TABLE IF NOT EXISTS sync_status (
          id TEXT PRIMARY KEY,
          source_db TEXT,
          target_db TEXT,
          sync_type TEXT,
          records_synced INTEGER DEFAULT 0,
          status TEXT,
          error_message TEXT,
          started_at TEXT,
          completed_at TEXT,
          metadata TEXT DEFAULT '{}'
        )
      `);

      // Create local cache table for fast access
      await this.run(`
        CREATE TABLE IF NOT EXISTS cache (
          key TEXT PRIMARY KEY,
          value TEXT,
          expires_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await this.run('CREATE INDEX IF NOT EXISTS idx_query_logs_user_id ON query_logs(user_id)');
      await this.run('CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs(created_at)');
      await this.run('CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at)');

      logger.info('SQLite tables initialized successfully');
    } catch (error) {
      logger.error('Error initializing SQLite tables:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE, etc.)
   * WARNING: This method is intentionally designed to execute arbitrary SQL queries.
   * It is the responsibility of the caller to ensure proper input validation.
   * Always use parameterized queries (params array) for user input.
   * 
   * @param {string} sql - SQL statement
   * @param {array} params - Parameterized values
   * @returns {Promise<object>} Result with lastID and changes
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error('SQLite run error:', { sql, error: err.message });
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Execute a SQL query and return a single row
   * WARNING: This method is intentionally designed to execute arbitrary SQL queries.
   * It is the responsibility of the caller to ensure proper input validation.
   * Always use parameterized queries (params array) for user input.
   * 
   * @param {string} sql - SQL query
   * @param {array} params - Parameterized values
   * @returns {Promise<object>} Single row result
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('SQLite get error:', { sql, error: err.message });
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Execute a SQL query and return all rows
   * WARNING: This method is intentionally designed to execute arbitrary SQL queries.
   * It is the responsibility of the caller to ensure proper input validation.
   * Always use parameterized queries (params array) for user input.
   * 
   * @param {string} sql - SQL query
   * @param {array} params - Parameterized values
   * @returns {Promise<array>} Array of row results
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('SQLite all error:', { sql, error: err.message });
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            logger.error('Error closing SQLite:', err);
            reject(err);
          } else {
            logger.info('SQLite connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = new SQLiteConnection();
