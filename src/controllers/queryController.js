const postgres = require('../config/postgres');
const sqlite = require('../config/sqlite');
const logger = require('../utils/logger');
const analyticsService = require('../services/analytics/analyticsService');
const { v4: uuidv4 } = require('uuid');

class QueryController {
  async executeQuery(req, res) {
    const startTime = Date.now();
    const { query, database = 'postgres', params = [] } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
      });
    }

    try {
      let result;
      let queryType = this.detectQueryType(query);

      if (database === 'postgres') {
        result = await postgres.query(query, params);
      } else if (database === 'sqlite') {
        if (queryType === 'SELECT') {
          result = { rows: await sqlite.all(query, params) };
        } else {
          result = await sqlite.run(query, params);
          result = { rows: [], rowCount: result.changes };
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid database. Use "postgres" or "sqlite"',
        });
      }

      const duration = Date.now() - startTime;

      // Log query
      await this.logQuery(req.user?.id, query, queryType, duration, 'success', database);

      // Track analytics
      await analyticsService.trackQuery({
        type: queryType,
        duration,
        database,
        status: 'success',
      });

      res.json({
        success: true,
        data: result.rows || result,
        rowCount: result.rowCount || result.rows?.length || 0,
        executionTime: duration,
        database,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Query execution error:', error);

      // Log failed query
      await this.logQuery(
        req.user?.id,
        query,
        this.detectQueryType(query),
        duration,
        'error',
        database,
        error.message
      );

      res.status(500).json({
        success: false,
        error: error.message,
        executionTime: duration,
      });
    }
  }

  async getQueryLogs(req, res) {
    try {
      const { limit = 50, offset = 0, userId, status } = req.query;

      let query = 'SELECT * FROM query_logs WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (userId) {
        query += ` AND user_id = $${paramCount}`;
        params.push(userId);
        paramCount++;
      }

      if (status) {
        query += ` AND status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await postgres.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      logger.error('Error fetching query logs:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getQueryStats(req, res) {
    try {
      const { timeRange = '24h' } = req.query;
      const interval = timeRange === '1h' ? '1 hour' :
                      timeRange === '24h' ? '24 hours' :
                      timeRange === '7d' ? '7 days' : '30 days';

      const result = await postgres.query(`
        SELECT 
          query_type,
          COUNT(*) as count,
          AVG(execution_time_ms) as avg_time,
          MAX(execution_time_ms) as max_time,
          MIN(execution_time_ms) as min_time,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
        FROM query_logs
        WHERE created_at > NOW() - INTERVAL '${interval}'
        GROUP BY query_type
        ORDER BY count DESC
      `);

      res.json({
        success: true,
        data: result.rows,
        timeRange,
      });
    } catch (error) {
      logger.error('Error fetching query stats:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  detectQueryType(query) {
    const trimmed = query.trim().toUpperCase();
    
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    if (trimmed.startsWith('CREATE')) return 'CREATE';
    if (trimmed.startsWith('ALTER')) return 'ALTER';
    if (trimmed.startsWith('DROP')) return 'DROP';
    
    return 'OTHER';
  }

  async logQuery(userId, queryText, queryType, executionTime, status, database = 'postgres', errorMessage = null) {
    try {
      await postgres.query(`
        INSERT INTO query_logs (id, user_id, query_text, query_type, execution_time_ms, status, error_message, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        uuidv4(),
        userId || null,
        queryText,
        queryType,
        executionTime,
        status,
        errorMessage,
        JSON.stringify({ database }),
      ]);
    } catch (error) {
      logger.error('Error logging query:', error);
    }
  }
}

module.exports = new QueryController();
