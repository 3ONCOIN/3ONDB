const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

class PostgresConnection {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      this.pool = new Pool(config.postgres);

      // Test connection
      const client = await this.pool.connect();
      logger.info('PostgreSQL connected successfully');
      client.release();

      // Handle errors
      this.pool.on('error', (err) => {
        logger.error('Unexpected PostgreSQL error:', err);
      });

      await this.initializeTables();
    } catch (error) {
      logger.error('Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  async initializeTables() {
    const client = await this.pool.connect();
    try {
      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          metadata JSONB DEFAULT '{}'::jsonb
        )
      `);

      // Create query_logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS query_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id),
          query_text TEXT NOT NULL,
          query_type VARCHAR(50),
          execution_time_ms INTEGER,
          status VARCHAR(50),
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB DEFAULT '{}'::jsonb
        )
      `);

      // Create data_health table
      await client.query(`
        CREATE TABLE IF NOT EXISTS data_health (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          table_name VARCHAR(255) NOT NULL,
          check_type VARCHAR(100),
          status VARCHAR(50),
          issues_found INTEGER DEFAULT 0,
          issues_fixed INTEGER DEFAULT 0,
          details JSONB DEFAULT '{}'::jsonb,
          checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create sync_status table
      await client.query(`
        CREATE TABLE IF NOT EXISTS sync_status (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          source_db VARCHAR(50),
          target_db VARCHAR(50),
          sync_type VARCHAR(50),
          records_synced INTEGER DEFAULT 0,
          status VARCHAR(50),
          error_message TEXT,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          metadata JSONB DEFAULT '{}'::jsonb
        )
      `);

      // Create backups table
      await client.query(`
        CREATE TABLE IF NOT EXISTS backups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          backup_name VARCHAR(255) NOT NULL,
          backup_type VARCHAR(50),
          file_path TEXT,
          file_size BIGINT,
          status VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB DEFAULT '{}'::jsonb
        )
      `);

      // Create analytics_events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_type VARCHAR(100),
          event_data JSONB,
          user_id UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create storage_metrics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS storage_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tier VARCHAR(50),
          total_size_bytes BIGINT,
          used_size_bytes BIGINT,
          connection_count INTEGER,
          query_count BIGINT,
          avg_query_time_ms NUMERIC,
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_query_logs_user_id ON query_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
      `);

      logger.info('PostgreSQL tables initialized successfully');
    } catch (error) {
      logger.error('Error initializing PostgreSQL tables:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a SQL query with parameterized values
   * WARNING: This method is intentionally designed to execute arbitrary SQL queries.
   * It is the responsibility of the caller to ensure proper input validation.
   * Always use parameterized queries (params array) for user input.
   * 
   * @param {string} text - SQL query text
   * @param {array} params - Parameterized values
   * @returns {Promise<object>} Query result
   */
  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Query error:', { text, error: error.message });
      throw error;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info('PostgreSQL connection closed');
    }
  }
}

module.exports = new PostgresConnection();
