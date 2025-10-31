const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { authMiddleware } = require('../middleware/auth');

// Sync routes
router.get('/status', systemController.syncStatus.bind(systemController));
router.post('/force', authMiddleware, systemController.forceSync.bind(systemController));

module.exports = router;
