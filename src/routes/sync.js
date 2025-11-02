const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { authMiddleware } = require('../middleware/auth');
const { expensiveLimiter } = require('../middleware/rateLimiter');

// Sync routes with rate limiting
router.get('/status', systemController.syncStatus.bind(systemController));
router.post('/force', authMiddleware, expensiveLimiter, systemController.forceSync.bind(systemController));

module.exports = router;
