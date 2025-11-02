const backupService = require('../services/backup/backupService');
const mirroringService = require('../services/mirroring/mirrorService');
const aiRepairService = require('../services/repair/aiRepair');
const analyticsService = require('../services/analytics/analyticsService');
const storageTierManager = require('../storage/storageTierManager');
const logger = require('../utils/logger');

class SystemController {
  // Backup endpoints
  async createBackup(req, res) {
    try {
      await backupService.performBackup();
      res.json({
        success: true,
        message: 'Backup initiated successfully',
      });
    } catch (error) {
      logger.error('Error creating backup:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async listBackups(req, res) {
    try {
      const { limit = 20 } = req.query;
      const backups = await backupService.listBackups(parseInt(limit));

      res.json({
        success: true,
        data: backups,
      });
    } catch (error) {
      logger.error('Error listing backups:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async restoreBackup(req, res) {
    try {
      const { backupId } = req.params;
      const result = await backupService.restoreBackup(backupId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error restoring backup:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Sync endpoints
  async syncStatus(req, res) {
    try {
      const history = await mirroringService.getSyncHistory();

      res.json({
        success: true,
        data: {
          isEnabled: mirroringService.isRunning,
          history,
        },
      });
    } catch (error) {
      logger.error('Error getting sync status:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async forceSync(req, res) {
    try {
      const { table } = req.body;

      if (table) {
        const synced = await mirroringService.forceSyncTable(table);
        res.json({
          success: true,
          message: `Synced ${synced} records for table ${table}`,
        });
      } else {
        await mirroringService.syncDatabases();
        res.json({
          success: true,
          message: 'Full sync initiated',
        });
      }
    } catch (error) {
      logger.error('Error forcing sync:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Health endpoints
  async getHealth(req, res) {
    try {
      const healthReport = await aiRepairService.getHealthReport();

      res.json({
        success: true,
        data: healthReport,
      });
    } catch (error) {
      logger.error('Error getting health report:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async forceHealthCheck(req, res) {
    try {
      await aiRepairService.performRepairCheck();

      res.json({
        success: true,
        message: 'Health check initiated',
      });
    } catch (error) {
      logger.error('Error forcing health check:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Analytics endpoints
  async getDashboard(req, res) {
    try {
      const dashboard = await analyticsService.getDashboardData();

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getAnalyticsSummary(req, res) {
    try {
      const { timeRange = '24h' } = req.query;
      const summary = await analyticsService.getAnalyticsSummary(timeRange);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Error getting analytics summary:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Storage tier endpoints
  async getStorageTiers(req, res) {
    try {
      const tiers = storageTierManager.getAllTiers();

      res.json({
        success: true,
        data: tiers,
      });
    } catch (error) {
      logger.error('Error getting storage tiers:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getCurrentTier(req, res) {
    try {
      const tier = storageTierManager.getCurrentTier();

      res.json({
        success: true,
        data: tier,
      });
    } catch (error) {
      logger.error('Error getting current tier:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getStorageMetrics(req, res) {
    try {
      const metrics = await storageTierManager.getDetailedMetrics();

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Error getting storage metrics:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // System status endpoint
  async getSystemStatus(req, res) {
    try {
      const [
        healthReport,
        syncHistory,
        storageMetrics,
        analyticsSummary,
      ] = await Promise.all([
        aiRepairService.getHealthReport(),
        mirroringService.getSyncHistory(),
        storageTierManager.getDetailedMetrics(),
        analyticsService.getAnalyticsSummary('1h'),
      ]);

      res.json({
        success: true,
        data: {
          status: 'operational',
          services: {
            aiRepair: aiRepairService.isRunning,
            mirroring: mirroringService.isRunning,
            backup: backupService.isRunning,
          },
          health: healthReport.slice(0, 5),
          sync: syncHistory.slice(0, 5),
          storage: storageMetrics,
          analytics: analyticsSummary,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error getting system status:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new SystemController();
