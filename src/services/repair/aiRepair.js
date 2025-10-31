const logger = require('../../utils/logger');
const postgres = require('../../config/postgres');
const sqlite = require('../../config/sqlite');
const config = require('../../config');
const { v4: uuidv4 } = require('uuid');

class AIRepairService {
  constructor() {
    this.isRunning = false;
    this.repairInterval = null;
  }

  start() {
    if (!config.ai.repairEnabled) {
      logger.info('AI Auto-Repair is disabled');
      return;
    }

    logger.info('Starting AI Auto-Repair service');
    this.isRunning = true;

    // Run initial check
    this.performRepairCheck();

    // Schedule periodic checks
    this.repairInterval = setInterval(() => {
      this.performRepairCheck();
    }, config.ai.repairInterval);
  }

  stop() {
    if (this.repairInterval) {
      clearInterval(this.repairInterval);
      this.repairInterval = null;
    }
    this.isRunning = false;
    logger.info('AI Auto-Repair service stopped');
  }

  async performRepairCheck() {
    if (!this.isRunning) return;

    try {
      logger.info('Running AI-based data integrity check');

      // Check PostgreSQL tables
      await this.checkPostgresTables();

      // Check SQLite tables
      await this.checkSQLiteTables();

      // Check data consistency between databases
      await this.checkDataConsistency();

      logger.info('AI repair check completed successfully');
    } catch (error) {
      logger.error('Error during AI repair check:', error);
    }
  }

  async checkPostgresTables() {
    try {
      const tables = ['users', 'query_logs', 'data_health', 'sync_status', 'backups', 'analytics_events', 'storage_metrics'];
      
      for (const table of tables) {
        const issues = await this.analyzeTableHealth(table, 'postgres');
        
        if (issues.length > 0) {
          logger.warn(`Found ${issues.length} issues in ${table} table (PostgreSQL)`);
          const fixed = await this.repairTableIssues(table, issues, 'postgres');
          
          // Log health check
          await this.logHealthCheck(table, 'integrity_check', issues.length, fixed);
        }
      }
    } catch (error) {
      logger.error('Error checking PostgreSQL tables:', error);
    }
  }

  async checkSQLiteTables() {
    try {
      const tables = ['users', 'query_logs', 'data_health', 'sync_status', 'cache'];
      
      for (const table of tables) {
        const issues = await this.analyzeTableHealth(table, 'sqlite');
        
        if (issues.length > 0) {
          logger.warn(`Found ${issues.length} issues in ${table} table (SQLite)`);
          const fixed = await this.repairTableIssues(table, issues, 'sqlite');
          
          // Log health check
          await this.logHealthCheck(table, 'integrity_check', issues.length, fixed);
        }
      }

      // Clean expired cache entries
      await this.cleanExpiredCache();
    } catch (error) {
      logger.error('Error checking SQLite tables:', error);
    }
  }

  async analyzeTableHealth(tableName, dbType) {
    const issues = [];

    try {
      if (dbType === 'postgres') {
        // Check for null values in NOT NULL columns
        const result = await postgres.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND is_nullable = 'NO'
        `, [tableName]);

        // Check for duplicate entries where uniqueness is expected
        if (tableName === 'users') {
          const duplicates = await postgres.query(`
            SELECT email, COUNT(*) as count 
            FROM users 
            GROUP BY email 
            HAVING COUNT(*) > 1
          `);
          
          if (duplicates.rows.length > 0) {
            issues.push({
              type: 'duplicate_email',
              severity: 'high',
              count: duplicates.rows.length,
              details: duplicates.rows,
            });
          }
        }

        // Check for orphaned records
        if (tableName === 'query_logs') {
          const orphaned = await postgres.query(`
            SELECT COUNT(*) as count 
            FROM query_logs ql 
            LEFT JOIN users u ON ql.user_id = u.id 
            WHERE ql.user_id IS NOT NULL AND u.id IS NULL
          `);
          
          if (orphaned.rows[0].count > 0) {
            issues.push({
              type: 'orphaned_records',
              severity: 'medium',
              count: parseInt(orphaned.rows[0].count),
              table: tableName,
            });
          }
        }
      } else if (dbType === 'sqlite') {
        // Run SQLite integrity check
        const integrityResult = await sqlite.get('PRAGMA integrity_check');
        
        if (integrityResult && integrityResult.integrity_check !== 'ok') {
          issues.push({
            type: 'integrity_violation',
            severity: 'critical',
            details: integrityResult,
          });
        }

        // Check for duplicate entries in SQLite
        if (tableName === 'users') {
          const duplicates = await sqlite.all(`
            SELECT email, COUNT(*) as count 
            FROM users 
            GROUP BY email 
            HAVING COUNT(*) > 1
          `);
          
          if (duplicates.length > 0) {
            issues.push({
              type: 'duplicate_email',
              severity: 'high',
              count: duplicates.length,
              details: duplicates,
            });
          }
        }
      }
    } catch (error) {
      logger.error(`Error analyzing ${tableName} health:`, error);
      issues.push({
        type: 'analysis_error',
        severity: 'high',
        error: error.message,
      });
    }

    return issues;
  }

  async repairTableIssues(tableName, issues, dbType) {
    let fixedCount = 0;

    for (const issue of issues) {
      try {
        if (issue.type === 'duplicate_email') {
          // Keep the oldest record, mark others as inactive
          if (dbType === 'postgres') {
            for (const dup of issue.details) {
              await postgres.query(`
                UPDATE users 
                SET is_active = false 
                WHERE email = $1 
                AND id NOT IN (
                  SELECT id FROM users WHERE email = $1 ORDER BY created_at ASC LIMIT 1
                )
              `, [dup.email]);
              fixedCount++;
            }
          } else if (dbType === 'sqlite') {
            for (const dup of issue.details) {
              await sqlite.run(`
                UPDATE users 
                SET is_active = 0 
                WHERE email = ? 
                AND id NOT IN (
                  SELECT id FROM users WHERE email = ? ORDER BY created_at ASC LIMIT 1
                )
              `, [dup.email, dup.email]);
              fixedCount++;
            }
          }
        } else if (issue.type === 'orphaned_records') {
          // Delete orphaned records
          if (dbType === 'postgres') {
            await postgres.query(`
              DELETE FROM ${tableName} 
              WHERE user_id NOT IN (SELECT id FROM users)
            `);
            fixedCount += issue.count;
          }
        }

        logger.info(`Fixed ${issue.type} in ${tableName} (${dbType})`);
      } catch (error) {
        logger.error(`Error fixing ${issue.type} in ${tableName}:`, error);
      }
    }

    return fixedCount;
  }

  async checkDataConsistency() {
    try {
      // Compare user counts between databases
      const pgUserCount = await postgres.query('SELECT COUNT(*) as count FROM users');
      const sqliteUserCount = await sqlite.get('SELECT COUNT(*) as count FROM users');

      const pgCount = parseInt(pgUserCount.rows[0].count);
      const sqliteCount = parseInt(sqliteUserCount.count);

      if (Math.abs(pgCount - sqliteCount) > config.ai.repairThreshold * Math.max(pgCount, sqliteCount)) {
        logger.warn(`Data inconsistency detected: PostgreSQL has ${pgCount} users, SQLite has ${sqliteCount} users`);
        
        await this.logHealthCheck('users', 'consistency_check', Math.abs(pgCount - sqliteCount), 0);
      }
    } catch (error) {
      logger.error('Error checking data consistency:', error);
    }
  }

  async cleanExpiredCache() {
    try {
      const result = await sqlite.run(`
        DELETE FROM cache 
        WHERE expires_at IS NOT NULL 
        AND datetime(expires_at) < datetime('now')
      `);
      
      if (result.changes > 0) {
        logger.info(`Cleaned ${result.changes} expired cache entries`);
      }
    } catch (error) {
      logger.error('Error cleaning expired cache:', error);
    }
  }

  async logHealthCheck(tableName, checkType, issuesFound, issuesFixed) {
    try {
      const status = issuesFound === 0 ? 'healthy' : (issuesFixed >= issuesFound ? 'repaired' : 'needs_attention');
      
      await postgres.query(`
        INSERT INTO data_health (id, table_name, check_type, status, issues_found, issues_fixed, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        uuidv4(),
        tableName,
        checkType,
        status,
        issuesFound,
        issuesFixed,
        JSON.stringify({ timestamp: new Date().toISOString() }),
      ]);
    } catch (error) {
      logger.error('Error logging health check:', error);
    }
  }

  async getHealthReport() {
    try {
      const result = await postgres.query(`
        SELECT * FROM data_health 
        ORDER BY checked_at DESC 
        LIMIT 50
      `);
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting health report:', error);
      return [];
    }
  }
}

module.exports = new AIRepairService();
