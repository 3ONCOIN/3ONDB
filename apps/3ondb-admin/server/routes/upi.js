const express = require('express');
const router = express.Router();

// Mock 3ONUPI sessions
const generateSessions = () => {
  return Array.from({ length: 30 }, (_, i) => ({
    sessionId: `3ONUPI-${Math.random().toString(36).substr(2, 16)}`,
    userId: `user-${Math.floor(Math.random() * 1000)}`,
    systemId: ['3ON-CHAIN-1001', '3ON-PAY-1002', '3ON-MATRIX-2001'][Math.floor(Math.random() * 3)],
    permissions: ['read', 'write', 'execute'],
    createdAt: Date.now() - Math.floor(Math.random() * 86400000),
    expiresAt: Date.now() + Math.floor(Math.random() * 86400000),
    lastActivity: Date.now() - Math.floor(Math.random() * 3600000),
    status: Math.random() > 0.2 ? 'active' : 'expired'
  }));
};

/**
 * GET /admin/upi/sessions
 * Get all 3ONUPI sessions
 */
router.get('/sessions', (req, res) => {
  const { status } = req.query;
  
  let sessions = generateSessions();

  // Filter by status
  if (status) {
    sessions = sessions.filter(s => s.status === status);
  }

  res.json({
    total: sessions.length,
    sessions,
    timestamp: Date.now()
  });
});

/**
 * GET /admin/upi/auth-logs
 * Get authentication logs
 */
router.get('/auth-logs', (req, res) => {
  const authLogs = Array.from({ length: 50 }, (_, i) => ({
    id: `auth-${Date.now()}-${i}`,
    userId: `user-${Math.floor(Math.random() * 1000)}`,
    action: ['login', 'logout', 'token_refresh', 'failed_login'][Math.floor(Math.random() * 4)],
    systemId: ['3ON-CHAIN-1001', '3ON-PAY-1002', '3ON-CORE-0001'][Math.floor(Math.random() * 3)],
    ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    success: Math.random() > 0.1,
    timestamp: Date.now() - Math.floor(Math.random() * 86400000)
  }));

  res.json({
    total: authLogs.length,
    logs: authLogs,
    timestamp: Date.now()
  });
});

/**
 * POST /admin/upi/revoke/:sessionId
 * Revoke a 3ONUPI session
 */
router.post('/revoke/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  res.json({
    message: 'Session revoked',
    sessionId,
    timestamp: Date.now()
  });
});

/**
 * GET /admin/upi/stats
 * Get 3ONUPI statistics
 */
router.get('/stats', (req, res) => {
  const stats = {
    totalSessions: Math.floor(Math.random() * 1000) + 500,
    activeSessions: Math.floor(Math.random() * 500) + 200,
    expiredSessions: Math.floor(Math.random() * 500) + 300,
    totalAuthAttempts: Math.floor(Math.random() * 10000) + 5000,
    successfulAuths: Math.floor(Math.random() * 9500) + 4800,
    failedAuths: Math.floor(Math.random() * 500) + 200,
    successRate: 96.5,
    timestamp: Date.now()
  };

  res.json(stats);
});

module.exports = router;
