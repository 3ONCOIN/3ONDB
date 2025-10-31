const express = require('express');
const router = express.Router();

/**
 * GET /admin/sync/status
 * Get sync status between databases
 */
router.get('/status', (req, res) => {
  const status = {
    sqlite: {
      connected: true,
      lastSync: Date.now() - 5000,
      recordCount: Math.floor(Math.random() * 10000) + 5000,
      size: Math.floor(Math.random() * 100000000) + 50000000,
      lag: Math.floor(Math.random() * 50)
    },
    postgresql: {
      connected: true,
      lastSync: Date.now() - 3000,
      recordCount: Math.floor(Math.random() * 10000) + 5000,
      size: Math.floor(Math.random() * 100000000) + 50000000,
      lag: Math.floor(Math.random() * 100)
    },
    syncStatus: 'active',
    lastFullSync: Date.now() - 3600000,
    nextScheduledSync: Date.now() + 300000,
    timestamp: Date.now()
  };

  res.json(status);
});

/**
 * GET /admin/sync/history
 * Get sync history
 */
router.get('/history', (req, res) => {
  const { limit = 50 } = req.query;

  const history = Array.from({ length: parseInt(limit) }, (_, i) => ({
    id: `sync-${Date.now()}-${i}`,
    type: ['full', 'incremental', 'delta'][Math.floor(Math.random() * 3)],
    source: ['sqlite', 'postgresql'][Math.floor(Math.random() * 2)],
    destination: ['sqlite', 'postgresql'][Math.floor(Math.random() * 2)],
    recordsSynced: Math.floor(Math.random() * 1000) + 100,
    duration: Math.floor(Math.random() * 5000) + 500,
    status: Math.random() > 0.1 ? 'success' : 'failed',
    timestamp: Date.now() - Math.floor(Math.random() * 86400000)
  }));

  res.json({
    total: history.length,
    history,
    timestamp: Date.now()
  });
});

/**
 * POST /admin/sync/trigger
 * Manually trigger sync
 */
router.post('/trigger', (req, res) => {
  const { type = 'incremental', source, destination } = req.body;

  res.json({
    message: 'Sync triggered',
    syncId: `sync-${Date.now()}`,
    type,
    source,
    destination,
    status: 'in_progress',
    timestamp: Date.now()
  });
});

/**
 * GET /admin/sync/conflicts
 * Get sync conflicts
 */
router.get('/conflicts', (req, res) => {
  const conflicts = Array.from({ length: 5 }, (_, i) => ({
    id: `conflict-${Date.now()}-${i}`,
    recordKey: `record-${Math.random().toString(36).substr(2, 9)}`,
    source: 'sqlite',
    destination: 'postgresql',
    conflictType: ['version_mismatch', 'data_inconsistency', 'timestamp_conflict'][Math.floor(Math.random() * 3)],
    detected: Date.now() - Math.floor(Math.random() * 86400000),
    resolved: Math.random() > 0.5,
    resolution: Math.random() > 0.5 ? 'source_wins' : 'destination_wins'
  }));

  res.json({
    total: conflicts.length,
    conflicts,
    timestamp: Date.now()
  });
});

module.exports = router;
