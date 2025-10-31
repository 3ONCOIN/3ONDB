const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { authMiddleware } = require('../middleware/auth');

// Backup routes
router.post('/backup', authMiddleware, systemController.createBackup.bind(systemController));
router.get('/backup', authMiddleware, systemController.listBackups.bind(systemController));
router.post('/backup/:backupId/restore', authMiddleware, systemController.restoreBackup.bind(systemController));

module.exports = router;
