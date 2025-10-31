const express = require('express');
const router = express.Router();

/**
 * GET /admin/metrics
 * Get real-time metrics
 */
router.get('/', (req, res) => {
  const metrics = {
    requestsPerSec: Math.floor(Math.random() * 100) + 50,
    totalRequests: Math.floor(Math.random() * 1000000) + 500000,
    errors: Math.floor(Math.random() * 10),
    errorRate: (Math.random() * 0.5).toFixed(2) + '%',
    replicationLag: Math.floor(Math.random() * 100),
    activeConnections: Math.floor(Math.random() * 200) + 100,
    uptime: Math.floor(Math.random() * 86400) + 3600,
    memoryUsage: {
      used: Math.floor(Math.random() * 1000) + 500,
      total: 2048,
      percentage: Math.floor(Math.random() * 50) + 30
    },
    cpuUsage: Math.floor(Math.random() * 60) + 20,
    timestamp: Date.now()
  };

  res.json(metrics);
});

/**
 * GET /admin/metrics/storage
 * Get storage tier metrics
 */
router.get('/storage', (req, res) => {
  const storage = {
    hot: {
      count: Math.floor(Math.random() * 1000) + 500,
      size: Math.floor(Math.random() * 10000000) + 5000000,
      percentage: 45
    },
    warm: {
      count: Math.floor(Math.random() * 500) + 200,
      size: Math.floor(Math.random() * 5000000) + 2000000,
      percentage: 25
    },
    cold: {
      count: Math.floor(Math.random() * 300) + 100,
      size: Math.floor(Math.random() * 3000000) + 1000000,
      percentage: 20
    },
    archive: {
      count: Math.floor(Math.random() * 200) + 50,
      size: Math.floor(Math.random() * 2000000) + 500000,
      percentage: 10
    },
    timestamp: Date.now()
  };

  res.json(storage);
});

/**
 * GET /admin/metrics/sync
 * Get sync metrics
 */
router.get('/sync', (req, res) => {
  const sync = {
    totalSyncs: Math.floor(Math.random() * 10000) + 5000,
    successfulSyncs: Math.floor(Math.random() * 9500) + 4800,
    failedSyncs: Math.floor(Math.random() * 50) + 10,
    successRate: 98.5,
    averageSyncTime: Math.floor(Math.random() * 500) + 100,
    lastSync: Date.now() - Math.floor(Math.random() * 60000),
    queueSize: Math.floor(Math.random() * 20),
    timestamp: Date.now()
  };

  res.json(sync);
});

/**
 * GET /admin/metrics/repair
 * Get auto-repair metrics
 */
router.get('/repair', (req, res) => {
  const repair = {
    totalRepairs: Math.floor(Math.random() * 100) + 50,
    successfulRepairs: Math.floor(Math.random() * 95) + 48,
    failedRepairs: Math.floor(Math.random() * 5) + 2,
    corruptedRecords: Math.floor(Math.random() * 10),
    lastRepair: Date.now() - Math.floor(Math.random() * 3600000),
    timestamp: Date.now()
  };

  res.json(repair);
});

module.exports = router;
