const logger = require('../../utils/logger');
const postgres = require('../../config/postgres');
const sqlite = require('../../config/sqlite');
const config = require('../../config');
const { v4: uuidv4 } = require('uuid');
const { validateTableName } = require('../../utils/security');

class MirroringService {
  constructor() {
    this.isRunning = false;
    this.mirrorInterval = null;
    this.syncQueue = [];
  }

  start() {
    if (!config.mirroring.enabled) {
      logger.info('Data mirroring is disabled');
      return;
    }

    logger.info('Starting real-time mirroring service');
    this.isRunning = true;

    // Start periodic synchronization
    this.mirrorInterval = setInterval(() => {
      this.syncDatabases();
    }, config.mirroring.interval);
  }

  stop() {
    if (this.mirrorInterval) {
      clearInterval(this.mirrorInterval);
      this.mirrorInterval = null;
    }
    this.isRunning = false;
    logger.info('Mirroring service stopped');
  }

  async syncDatabases() {
    if (!this.isRunning) return;

    try {
      const startTime = Date.now();
      logger.debug('Starting database synchronization');

      // Sync users table
      const usersSynced = await this.syncTable('users');

      // Sync query_logs table
      const logsSynced = await this.syncTable('query_logs');

      // Sync data_health table
      const healthSynced = await this.syncTable('data_health');

      // Sync sync_status table
      const statusSynced = await this.syncTable('sync_status');

      const duration = Date.now() - startTime;
      const totalSynced = usersSynced + logsSynced + healthSynced + statusSynced;

      logger.info(`Sync completed: ${totalSynced} records in ${duration}ms`);

      // Log sync status
      await this.logSyncStatus('periodic', totalSynced, 'completed', duration);
    } catch (error) {
      logger.error('Error during database sync:', error);
      await this.logSyncStatus('periodic', 0, 'failed', 0, error.message);
    }
  }

  async syncTable(tableName) {
    try {
      // Validate table name to prevent SQL injection
      validateTableName(tableName);
      
      let syncedCount = 0;

      // Get the latest timestamp from SQLite for this table
      const lastSync = await sqlite.get(`
        SELECT MAX(updated_at) as last_updated 
        FROM ${tableName}
      `);

      const lastUpdated = lastSync?.last_updated || '1970-01-01';

      // Get new/updated records from PostgreSQL
      const pgQuery = tableName === 'users'
        ? `SELECT * FROM ${tableName} WHERE updated_at > $1 ORDER BY updated_at ASC LIMIT $2`
        : `SELECT * FROM ${tableName} WHERE created_at > $1 ORDER BY created_at ASC LIMIT $2`;

      const newRecords = await postgres.query(pgQuery, [lastUpdated, config.mirroring.batchSize]);

      // Sync to SQLite
      for (const record of newRecords.rows) {
        await this.syncRecordToSQLite(tableName, record);
        syncedCount++;
      }

      // Also sync from SQLite to PostgreSQL (bidirectional)
      const sqliteLastSync = await this.getLastSyncFromPostgres(tableName);
      const sqliteQuery = tableName === 'users'
        ? `SELECT * FROM ${tableName} WHERE updated_at > ? ORDER BY updated_at ASC LIMIT ?`
        : `SELECT * FROM ${tableName} WHERE created_at > ? ORDER BY created_at ASC LIMIT ?`;

      const sqliteRecords = await sqlite.all(sqliteQuery, [sqliteLastSync, config.mirroring.batchSize]);

      // Sync to PostgreSQL
      for (const record of sqliteRecords) {
        await this.syncRecordToPostgres(tableName, record);
        syncedCount++;
      }

      if (syncedCount > 0) {
        logger.debug(`Synced ${syncedCount} records for ${tableName}`);
      }

      return syncedCount;
    } catch (error) {
      logger.error(`Error syncing ${tableName}:`, error);
      return 0;
    }
  }

  async syncRecordToSQLite(tableName, record) {
    try {
      // Convert PostgreSQL record to SQLite format
      const sqliteRecord = this.convertToSQLiteFormat(record);

      // Check if record exists
      const existing = await sqlite.get(
        `SELECT id FROM ${tableName} WHERE id = ?`,
        [sqliteRecord.id]
      );

      if (existing) {
        // Update existing record
        const fields = Object.keys(sqliteRecord).filter(k => k !== 'id');
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => sqliteRecord[f]);
        values.push(sqliteRecord.id);

        await sqlite.run(
          `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
          values
        );
      } else {
        // Insert new record
        const fields = Object.keys(sqliteRecord);
        const placeholders = fields.map(() => '?').join(', ');
        const values = fields.map(f => sqliteRecord[f]);

        await sqlite.run(
          `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
          values
        );
      }
    } catch (error) {
      logger.error(`Error syncing record to SQLite (${tableName}):`, error);
      throw error;
    }
  }

  async syncRecordToPostgres(tableName, record) {
    try {
      // Convert SQLite record to PostgreSQL format
      const pgRecord = this.convertToPostgresFormat(record);

      // Check if record exists
      const existing = await postgres.query(
        `SELECT id FROM ${tableName} WHERE id = $1`,
        [pgRecord.id]
      );

      if (existing.rows.length > 0) {
        // Update existing record
        const fields = Object.keys(pgRecord).filter(k => k !== 'id');
        const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
        const values = fields.map(f => pgRecord[f]);
        values.push(pgRecord.id);

        await postgres.query(
          `UPDATE ${tableName} SET ${setClause} WHERE id = $${values.length}`,
          values
        );
      } else {
        // Insert new record
        const fields = Object.keys(pgRecord);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
        const values = fields.map(f => pgRecord[f]);

        await postgres.query(
          `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
          values
        );
      }
    } catch (error) {
      logger.error(`Error syncing record to PostgreSQL (${tableName}):`, error);
      throw error;
    }
  }

  convertToSQLiteFormat(record) {
    const converted = { ...record };

    // Convert JSONB to TEXT
    if (converted.metadata && typeof converted.metadata === 'object') {
      converted.metadata = JSON.stringify(converted.metadata);
    }
    if (converted.details && typeof converted.details === 'object') {
      converted.details = JSON.stringify(converted.details);
    }

    // Convert boolean to integer
    if (typeof converted.is_active === 'boolean') {
      converted.is_active = converted.is_active ? 1 : 0;
    }

    // Convert dates to ISO strings
    Object.keys(converted).forEach(key => {
      if (converted[key] instanceof Date) {
        converted[key] = converted[key].toISOString();
      }
    });

    return converted;
  }

  convertToPostgresFormat(record) {
    const converted = { ...record };

    // Parse JSON strings to objects
    if (converted.metadata && typeof converted.metadata === 'string') {
      try {
        converted.metadata = JSON.parse(converted.metadata);
      } catch (e) {
        converted.metadata = {};
      }
    }
    if (converted.details && typeof converted.details === 'string') {
      try {
        converted.details = JSON.parse(converted.details);
      } catch (e) {
        converted.details = {};
      }
    }

    // Convert integer to boolean
    if (typeof converted.is_active === 'number') {
      converted.is_active = converted.is_active === 1;
    }

    return converted;
  }

  async getLastSyncFromPostgres(tableName) {
    try {
      const result = await postgres.query(`
        SELECT MAX(updated_at) as last_updated 
        FROM ${tableName}
      `);
      return result.rows[0]?.last_updated || '1970-01-01';
    } catch (error) {
      return '1970-01-01';
    }
  }

  async logSyncStatus(syncType, recordsSynced, status, duration, errorMessage = null) {
    try {
      const syncId = uuidv4();
      const now = new Date().toISOString();

      await postgres.query(`
        INSERT INTO sync_status (id, source_db, target_db, sync_type, records_synced, status, error_message, started_at, completed_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        syncId,
        'postgres',
        'sqlite',
        syncType,
        recordsSynced,
        status,
        errorMessage,
        now,
        now,
        JSON.stringify({ duration_ms: duration }),
      ]);
    } catch (error) {
      logger.error('Error logging sync status:', error);
    }
  }

  async getSyncHistory(limit = 20) {
    try {
      const result = await postgres.query(`
        SELECT * FROM sync_status 
        ORDER BY started_at DESC 
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting sync history:', error);
      return [];
    }
  }

  async forceSyncTable(tableName) {
    logger.info(`Forcing sync for table: ${tableName}`);
    return await this.syncTable(tableName);
  }
}

module.exports = new MirroringService();
