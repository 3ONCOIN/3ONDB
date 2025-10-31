const express = require('express');
const router = express.Router();
const queryController = require('../controllers/queryController');
const { optionalAuth } = require('../middleware/auth');

// Execute a query
router.post('/', optionalAuth, queryController.executeQuery.bind(queryController));

// Get query logs
router.get('/logs', queryController.getQueryLogs.bind(queryController));

// Get query statistics
router.get('/stats', queryController.getQueryStats.bind(queryController));

module.exports = router;
