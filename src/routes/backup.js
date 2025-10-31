const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { authMiddleware } = require('../middleware/auth');
const { expensiveLimiter } = require('../middleware/rateLimiter');

// Backup routes with rate limiting for expensive operations
router.post('/backup', authMiddleware, expensiveLimiter, systemController.createBackup.bind(systemController));
router.get('/backup', authMiddleware, expensiveLimiter, systemController.listBackups.bind(systemController));
router.post('/backup/:backupId/restore', authMiddleware, expensiveLimiter, systemController.restoreBackup.bind(systemController));

module.exports = router;
