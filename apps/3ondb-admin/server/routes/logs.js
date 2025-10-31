const express = require('express');
const router = express.Router();

// Mock log entries
const generateLogs = () => {
  const levels = ['info', 'warn', 'error', 'debug'];
  const sources = ['3ONCHAIN', '3ONPAY', '3ONMATRIX', '3ONCORE', '3ONWORLD'];
  const messages = [
    'Transaction processed successfully',
    'Heartbeat received',
    'Connection established',
    'Data synchronized',
    'Health check passed',
    'Auto-repair triggered',
    'Token validated',
    'Query executed'
  ];

  return Array.from({ length: 50 }, (_, i) => ({
    id: `log-${Date.now()}-${i}`,
    level: levels[Math.floor(Math.random() * levels.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    timestamp: Date.now() - Math.floor(Math.random() * 3600000),
    metadata: {
      requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
      duration: Math.floor(Math.random() * 1000)
    }
  }));
};

/**
 * GET /admin/logs
 * Get system logs
 */
router.get('/', (req, res) => {
  const { level, source, limit = 50 } = req.query;
  
  let logs = generateLogs();

  // Filter by level
  if (level) {
    logs = logs.filter(l => l.level === level);
  }

  // Filter by source
  if (source) {
    logs = logs.filter(l => l.source === source);
  }

  // Apply limit
  logs = logs.slice(0, parseInt(limit));

  res.json({
    total: logs.length,
    logs,
    timestamp: Date.now()
  });
});

/**
 * GET /admin/logs/errors
 * Get error logs only
 */
router.get('/errors', (req, res) => {
  const logs = generateLogs().filter(l => l.level === 'error');

  res.json({
    total: logs.length,
    logs,
    timestamp: Date.now()
  });
});

/**
 * GET /admin/logs/repair
 * Get auto-repair action logs
 */
router.get('/repair', (req, res) => {
  const repairLogs = Array.from({ length: 20 }, (_, i) => ({
    id: `repair-${Date.now()}-${i}`,
    action: ['checksum_fixed', 'metadata_corrected', 'timestamp_updated'][Math.floor(Math.random() * 3)],
    recordKey: `record-${Math.random().toString(36).substr(2, 9)}`,
    status: Math.random() > 0.1 ? 'success' : 'failed',
    timestamp: Date.now() - Math.floor(Math.random() * 86400000),
    details: {
      issuesFound: Math.floor(Math.random() * 3) + 1,
      issuesFixed: Math.floor(Math.random() * 3)
    }
  }));

  res.json({
    total: repairLogs.length,
    logs: repairLogs,
    timestamp: Date.now()
  });
});

module.exports = router;
