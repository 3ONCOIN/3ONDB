const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

// System status
router.get('/status', systemController.getSystemStatus.bind(systemController));

// Health routes
router.get('/health', systemController.getHealth.bind(systemController));
router.post('/health/check', systemController.forceHealthCheck.bind(systemController));

// Analytics routes
router.get('/dashboard', systemController.getDashboard.bind(systemController));
router.get('/analytics', systemController.getAnalyticsSummary.bind(systemController));

// Storage routes
router.get('/storage/tiers', systemController.getStorageTiers.bind(systemController));
router.get('/storage/current', systemController.getCurrentTier.bind(systemController));
router.get('/storage/metrics', systemController.getStorageMetrics.bind(systemController));

module.exports = router;
