const logger = require('../../utils/logger');
const postgres = require('../../config/postgres');
const config = require('../../config');
const { v4: uuidv4 } = require('uuid');

class AnalyticsService {
  constructor() {
    this.eventBuffer = [];
    this.metricsCache = {
      queries: [],
      connections: 0,
      storageUsed: 0,
      lastUpdate: null,
    };
    this.wsClients = new Set();
  }

  // Register WebSocket client for real-time updates
  registerClient(ws) {
    this.wsClients.add(ws);
    logger.debug('Analytics client registered');

    // Send current metrics immediately
    this.sendMetricsToClient(ws);

    ws.on('close', () => {
      this.wsClients.delete(ws);
      logger.debug('Analytics client disconnected');
    });
  }

  // Track a query execution
  async trackQuery(queryData) {
    try {
      const event = {
        id: uuidv4(),
        type: 'query_execution',
        data: queryData,
        timestamp: new Date().toISOString(),
      };

      this.eventBuffer.push(event);

      // Update metrics cache
      this.metricsCache.queries.push({
        type: queryData.type,
        duration: queryData.duration,
        timestamp: event.timestamp,
      });

      // Keep only recent queries (last 100)
      if (this.metricsCache.queries.length > 100) {
        this.metricsCache.queries.shift();
      }

      // Broadcast to connected clients
      this.broadcastMetrics();

      // Flush buffer if needed
      if (this.eventBuffer.length >= config.analytics.bufferSize) {
        await this.flushEventBuffer();
      }
    } catch (error) {
      logger.error('Error tracking query:', error);
    }
  }

  // Track system metrics
  async trackMetrics(metrics) {
    try {
      this.metricsCache = {
        ...this.metricsCache,
        ...metrics,
        lastUpdate: new Date().toISOString(),
      };

      this.broadcastMetrics();

      // Store in database
      await postgres.query(`
        INSERT INTO storage_metrics (id, tier, total_size_bytes, used_size_bytes, connection_count, query_count, avg_query_time_ms)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        uuidv4(),
        config.storage.tier,
        metrics.totalSize || 0,
        metrics.usedSize || 0,
        metrics.connections || 0,
        metrics.queryCount || 0,
        metrics.avgQueryTime || 0,
      ]);
    } catch (error) {
      logger.error('Error tracking metrics:', error);
    }
  }

  // Get real-time dashboard data
  async getDashboardData() {
    try {
      const [
        recentQueries,
        healthStatus,
        syncStatus,
        storageMetrics,
      ] = await Promise.all([
        this.getRecentQueries(),
        this.getHealthStatus(),
        this.getSyncStatus(),
        this.getStorageMetrics(),
      ]);

      return {
        queries: recentQueries,
        health: healthStatus,
        sync: syncStatus,
        storage: storageMetrics,
        realtime: this.metricsCache,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      return null;
    }
  }

  async getRecentQueries(limit = 20) {
    try {
      const result = await postgres.query(`
        SELECT 
          query_type,
          COUNT(*) as count,
          AVG(execution_time_ms) as avg_time,
          MAX(execution_time_ms) as max_time,
          MIN(execution_time_ms) as min_time
        FROM query_logs
        WHERE created_at > NOW() - INTERVAL '1 hour'
        GROUP BY query_type
        ORDER BY count DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting recent queries:', error);
      return [];
    }
  }

  async getHealthStatus() {
    try {
      const result = await postgres.query(`
        SELECT 
          table_name,
          status,
          issues_found,
          issues_fixed,
          checked_at
        FROM data_health
        WHERE checked_at > NOW() - INTERVAL '1 hour'
        ORDER BY checked_at DESC
        LIMIT 10
      `);

      return result.rows;
    } catch (error) {
      logger.error('Error getting health status:', error);
      return [];
    }
  }

  async getSyncStatus() {
    try {
      const result = await postgres.query(`
        SELECT 
          sync_type,
          records_synced,
          status,
          started_at,
          completed_at
        FROM sync_status
        ORDER BY started_at DESC
        LIMIT 10
      `);

      return result.rows;
    } catch (error) {
      logger.error('Error getting sync status:', error);
      return [];
    }
  }

  async getStorageMetrics() {
    try {
      const result = await postgres.query(`
        SELECT 
          tier,
          used_size_bytes,
          connection_count,
          query_count,
          avg_query_time_ms,
          recorded_at
        FROM storage_metrics
        ORDER BY recorded_at DESC
        LIMIT 1
      `);

      const currentTier = config.storage.tiers[config.storage.tier];
      const metrics = result.rows[0] || {};

      return {
        tier: config.storage.tier,
        tierConfig: currentTier,
        current: metrics,
        usagePercent: currentTier ? (metrics.used_size_bytes / currentTier.maxSize) * 100 : 0,
      };
    } catch (error) {
      logger.error('Error getting storage metrics:', error);
      return {};
    }
  }

  // Broadcast metrics to all connected WebSocket clients
  broadcastMetrics() {
    if (this.wsClients.size === 0) return;

    const data = {
      type: 'metrics_update',
      data: this.metricsCache,
      timestamp: new Date().toISOString(),
    };

    this.wsClients.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        try {
          ws.send(JSON.stringify(data));
        } catch (error) {
          logger.error('Error sending metrics to client:', error);
        }
      }
    });
  }

  sendMetricsToClient(ws) {
    if (ws.readyState === 1) {
      const data = {
        type: 'metrics_update',
        data: this.metricsCache,
        timestamp: new Date().toISOString(),
      };

      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        logger.error('Error sending metrics to client:', error);
      }
    }
  }

  // Flush event buffer to database
  async flushEventBuffer() {
    if (this.eventBuffer.length === 0) return;

    try {
      const events = [...this.eventBuffer];
      this.eventBuffer = [];

      for (const event of events) {
        await postgres.query(`
          INSERT INTO analytics_events (id, event_type, event_data, created_at)
          VALUES ($1, $2, $3, $4)
        `, [
          event.id,
          event.type,
          JSON.stringify(event.data),
          event.timestamp,
        ]);
      }

      logger.debug(`Flushed ${events.length} analytics events to database`);
    } catch (error) {
      logger.error('Error flushing event buffer:', error);
      // Put events back in buffer
      this.eventBuffer.unshift(...events);
    }
  }

  // Get analytics summary
  async getAnalyticsSummary(timeRange = '24h') {
    try {
      const interval = timeRange === '1h' ? '1 hour' :
                      timeRange === '24h' ? '24 hours' :
                      timeRange === '7d' ? '7 days' : '30 days';

      const result = await postgres.query(`
        SELECT 
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(*) as total_queries,
          AVG(execution_time_ms) as avg_query_time,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_queries,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_queries
        FROM query_logs
        WHERE created_at > NOW() - INTERVAL '${interval}'
      `);

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting analytics summary:', error);
      return null;
    }
  }
}

module.exports = new AnalyticsService();
