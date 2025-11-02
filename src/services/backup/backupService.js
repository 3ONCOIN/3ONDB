const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const logger = require('../../utils/logger');
const postgres = require('../../config/postgres');
const config = require('../../config');
const { v4: uuidv4 } = require('uuid');
const { validateTableName } = require('../../utils/security');

class BackupService {
  constructor() {
    this.isRunning = false;
    this.backupInterval = null;
  }

  async start() {
    if (!config.backup.enabled) {
      logger.info('Backup service is disabled');
      return;
    }

    logger.info('Starting backup service');
    this.isRunning = true;

    // Ensure backup directory exists
    try {
      await fs.mkdir(config.backup.path, { recursive: true });
    } catch (error) {
      logger.error('Error creating backup directory:', error);
    }

    // Schedule periodic backups
    this.backupInterval = setInterval(() => {
      this.performBackup();
    }, config.backup.interval);

    // Perform initial backup
    this.performBackup();

    // Schedule cleanup of old backups
    setInterval(() => {
      this.cleanupOldBackups();
    }, 86400000); // Daily
  }

  stop() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
    this.isRunning = false;
    logger.info('Backup service stopped');
  }

  async performBackup() {
    if (!this.isRunning) return;

    try {
      logger.info('Starting database backup');
      const startTime = Date.now();

      const backupId = uuidv4();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Backup PostgreSQL
      const pgBackupPath = await this.backupPostgres(timestamp);
      
      // Backup SQLite
      const sqliteBackupPath = await this.backupSQLite(timestamp);

      const duration = Date.now() - startTime;

      // Get backup file sizes
      const pgSize = await this.getFileSize(pgBackupPath);
      const sqliteSize = await this.getFileSize(sqliteBackupPath);

      // Log backups
      await this.logBackup(backupId, 'postgres', pgBackupPath, pgSize);
      await this.logBackup(uuidv4(), 'sqlite', sqliteBackupPath, sqliteSize);

      logger.info(`Backup completed in ${duration}ms - PostgreSQL: ${pgSize} bytes, SQLite: ${sqliteSize} bytes`);
    } catch (error) {
      logger.error('Error during backup:', error);
    }
  }

  async backupPostgres(timestamp) {
    const filename = `postgres_backup_${timestamp}.sql`;
    const backupPath = path.join(config.backup.path, filename);

    return new Promise((resolve, reject) => {
      try {
        // Use pg_dump for PostgreSQL backup
        const pgDump = spawn('pg_dump', [
          '-h', config.postgres.host,
          '-p', config.postgres.port.toString(),
          '-U', config.postgres.user,
          '-d', config.postgres.database,
          '-F', 'p', // Plain text format
          '-f', backupPath,
        ], {
          env: {
            ...process.env,
            PGPASSWORD: config.postgres.password,
          },
        });

        let errorOutput = '';

        pgDump.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        pgDump.on('close', (code) => {
          if (code === 0) {
            logger.info(`PostgreSQL backup created: ${filename}`);
            resolve(backupPath);
          } else {
            // If pg_dump is not available, create a logical backup
            logger.warn('pg_dump not available, creating logical backup');
            this.createLogicalBackup('postgres', backupPath)
              .then(resolve)
              .catch(reject);
          }
        });

        pgDump.on('error', (error) => {
          logger.warn('pg_dump error, falling back to logical backup:', error.message);
          this.createLogicalBackup('postgres', backupPath)
            .then(resolve)
            .catch(reject);
        });
      } catch (error) {
        logger.warn('Error starting pg_dump, using logical backup:', error.message);
        this.createLogicalBackup('postgres', backupPath)
          .then(resolve)
          .catch(reject);
      }
    });
  }

  async backupSQLite(timestamp) {
    const filename = `sqlite_backup_${timestamp}.db`;
    const backupPath = path.join(config.backup.path, filename);

    try {
      // Copy SQLite database file
      await fs.copyFile(config.sqlite.filename, backupPath);
      logger.info(`SQLite backup created: ${filename}`);
      return backupPath;
    } catch (error) {
      logger.error('Error backing up SQLite:', error);
      throw error;
    }
  }

  async createLogicalBackup(dbType, backupPath) {
    try {
      const tables = ['users', 'query_logs', 'data_health', 'sync_status', 'backups', 'analytics_events', 'storage_metrics'];
      let backupData = {
        database: dbType,
        timestamp: new Date().toISOString(),
        tables: {},
      };

      for (const table of tables) {
        try {
          // Validate table name to prevent SQL injection
          validateTableName(table);
          const result = await postgres.query(`SELECT * FROM ${table}`);
          backupData.tables[table] = result.rows;
        } catch (error) {
          logger.warn(`Could not backup table ${table}:`, error.message);
          backupData.tables[table] = [];
        }
      }

      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      logger.info(`Logical backup created: ${path.basename(backupPath)}`);
      return backupPath;
    } catch (error) {
      logger.error('Error creating logical backup:', error);
      throw error;
    }
  }

  async getFileSize(filepath) {
    try {
      const stats = await fs.stat(filepath);
      return stats.size;
    } catch (error) {
      logger.error('Error getting file size:', error);
      return 0;
    }
  }

  async logBackup(backupId, backupType, filePath, fileSize) {
    try {
      await postgres.query(`
        INSERT INTO backups (id, backup_name, backup_type, file_path, file_size, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        backupId,
        path.basename(filePath),
        backupType,
        filePath,
        fileSize,
        'completed',
      ]);
    } catch (error) {
      logger.error('Error logging backup:', error);
    }
  }

  async cleanupOldBackups() {
    try {
      logger.info('Cleaning up old backups');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.backup.retentionDays);

      // Get old backups from database
      const result = await postgres.query(`
        SELECT id, file_path FROM backups
        WHERE created_at < $1
      `, [cutoffDate.toISOString()]);

      for (const backup of result.rows) {
        try {
          // Delete file
          await fs.unlink(backup.file_path);
          
          // Delete from database
          await postgres.query('DELETE FROM backups WHERE id = $1', [backup.id]);
          
          logger.info(`Deleted old backup: ${backup.file_path}`);
        } catch (error) {
          logger.error(`Error deleting backup ${backup.file_path}:`, error);
        }
      }

      logger.info(`Cleaned up ${result.rows.length} old backups`);
    } catch (error) {
      logger.error('Error cleaning up old backups:', error);
    }
  }

  async listBackups(limit = 20) {
    try {
      const result = await postgres.query(`
        SELECT * FROM backups
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error listing backups:', error);
      return [];
    }
  }

  async restoreBackup(backupId) {
    try {
      logger.info(`Restoring backup: ${backupId}`);

      const result = await postgres.query(
        'SELECT * FROM backups WHERE id = $1',
        [backupId]
      );

      if (result.rows.length === 0) {
        throw new Error('Backup not found');
      }

      const backup = result.rows[0];
      
      // Check if backup file exists
      try {
        await fs.access(backup.file_path);
      } catch {
        throw new Error('Backup file not found');
      }

      logger.info(`Backup restore initiated for: ${backup.backup_name}`);
      
      return {
        success: true,
        message: 'Backup file found. Manual restoration required for production safety.',
        backup: backup,
      };
    } catch (error) {
      logger.error('Error restoring backup:', error);
      throw error;
    }
  }
}

module.exports = new BackupService();
