const logger = require('../utils/logger');
const config = require('../config');
const postgres = require('../config/postgres');

class StorageTierManager {
  constructor() {
    this.currentTier = config.storage.tier;
    this.tierConfig = config.storage.tiers[this.currentTier];
    this.metrics = {
      usedSize: 0,
      totalSize: this.tierConfig.maxSize,
      connections: 0,
      queries: 0,
    };
  }

  getCurrentTier() {
    return {
      name: this.currentTier,
      config: this.tierConfig,
      metrics: this.metrics,
      usagePercent: (this.metrics.usedSize / this.tierConfig.maxSize) * 100,
    };
  }

  getAllTiers() {
    return Object.keys(config.storage.tiers).map(tierName => ({
      name: tierName,
      config: config.storage.tiers[tierName],
      isCurrent: tierName === this.currentTier,
    }));
  }

  async updateMetrics() {
    try {
      // Get database size from PostgreSQL
      const sizeResult = await postgres.query(`
        SELECT pg_database_size($1) as size
      `, [config.postgres.database]);

      this.metrics.usedSize = parseInt(sizeResult.rows[0]?.size || 0);

      // Get connection count
      const connResult = await postgres.query(`
        SELECT count(*) as count
        FROM pg_stat_activity
        WHERE datname = $1
      `, [config.postgres.database]);

      this.metrics.connections = parseInt(connResult.rows[0]?.count || 0);

      // Get query count from logs
      const queryResult = await postgres.query(`
        SELECT COUNT(*) as count
        FROM query_logs
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `);

      this.metrics.queries = parseInt(queryResult.rows[0]?.count || 0);

      logger.debug('Storage metrics updated', this.metrics);
    } catch (error) {
      logger.error('Error updating storage metrics:', error);
    }
  }

  checkCapacity() {
    const usagePercent = (this.metrics.usedSize / this.tierConfig.maxSize) * 100;
    const connectionPercent = (this.metrics.connections / this.tierConfig.maxConnections) * 100;

    const warnings = [];

    if (usagePercent > 90) {
      warnings.push({
        type: 'storage',
        severity: 'critical',
        message: `Storage usage at ${usagePercent.toFixed(2)}%`,
        recommendation: 'Consider upgrading to a higher tier or cleaning up old data',
      });
    } else if (usagePercent > 75) {
      warnings.push({
        type: 'storage',
        severity: 'warning',
        message: `Storage usage at ${usagePercent.toFixed(2)}%`,
        recommendation: 'Monitor storage usage and plan for capacity increase',
      });
    }

    if (connectionPercent > 90) {
      warnings.push({
        type: 'connections',
        severity: 'critical',
        message: `Connection usage at ${connectionPercent.toFixed(2)}%`,
        recommendation: 'Consider upgrading to a higher tier or optimizing connection pooling',
      });
    } else if (connectionPercent > 75) {
      warnings.push({
        type: 'connections',
        severity: 'warning',
        message: `Connection usage at ${connectionPercent.toFixed(2)}%`,
        recommendation: 'Monitor connection usage',
      });
    }

    return warnings;
  }

  canUpgrade() {
    const tierNames = Object.keys(config.storage.tiers);
    const currentIndex = tierNames.indexOf(this.currentTier);
    return currentIndex < tierNames.length - 1;
  }

  canDowngrade() {
    const tierNames = Object.keys(config.storage.tiers);
    const currentIndex = tierNames.indexOf(this.currentTier);
    return currentIndex > 0;
  }

  getNextTier() {
    if (!this.canUpgrade()) return null;

    const tierNames = Object.keys(config.storage.tiers);
    const currentIndex = tierNames.indexOf(this.currentTier);
    const nextTierName = tierNames[currentIndex + 1];

    return {
      name: nextTierName,
      config: config.storage.tiers[nextTierName],
    };
  }

  getPreviousTier() {
    if (!this.canDowngrade()) return null;

    const tierNames = Object.keys(config.storage.tiers);
    const currentIndex = tierNames.indexOf(this.currentTier);
    const prevTierName = tierNames[currentIndex - 1];

    return {
      name: prevTierName,
      config: config.storage.tiers[prevTierName],
    };
  }

  getScalingRecommendation() {
    const warnings = this.checkCapacity();
    
    if (warnings.some(w => w.severity === 'critical')) {
      const nextTier = this.getNextTier();
      if (nextTier) {
        return {
          action: 'upgrade',
          recommended: true,
          currentTier: this.currentTier,
          targetTier: nextTier.name,
          reason: 'Critical capacity warnings detected',
          warnings,
        };
      }
      return {
        action: 'optimize',
        recommended: true,
        currentTier: this.currentTier,
        reason: 'At maximum tier, optimization required',
        warnings,
      };
    }

    if (warnings.some(w => w.severity === 'warning')) {
      return {
        action: 'monitor',
        recommended: true,
        currentTier: this.currentTier,
        reason: 'Capacity warnings detected, monitor closely',
        warnings,
      };
    }

    // Check if we can downgrade (under 50% usage)
    const usagePercent = (this.metrics.usedSize / this.tierConfig.maxSize) * 100;
    const connectionPercent = (this.metrics.connections / this.tierConfig.maxConnections) * 100;

    if (usagePercent < 50 && connectionPercent < 50 && this.canDowngrade()) {
      const prevTier = this.getPreviousTier();
      return {
        action: 'consider_downgrade',
        recommended: false,
        currentTier: this.currentTier,
        targetTier: prevTier.name,
        reason: 'Low resource utilization, downgrade may reduce costs',
        warnings: [],
      };
    }

    return {
      action: 'none',
      recommended: true,
      currentTier: this.currentTier,
      reason: 'Operating within normal parameters',
      warnings: [],
    };
  }

  async getDetailedMetrics() {
    await this.updateMetrics();

    return {
      tier: this.getCurrentTier(),
      capacity: this.checkCapacity(),
      scaling: this.getScalingRecommendation(),
      allTiers: this.getAllTiers(),
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new StorageTierManager();
