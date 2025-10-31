const express = require('express');
const router = express.Router();

// Mock data for 3ON systems
const mockSystems = require('../utils/mockData').systems;

/**
 * GET /admin/systems
 * Get all registered 3ON systems
 */
router.get('/', (req, res) => {
  const { category, status, search } = req.query;
  
  let systems = [...mockSystems];

  // Filter by category
  if (category) {
    systems = systems.filter(s => s.category === category);
  }

  // Filter by status
  if (status) {
    systems = systems.filter(s => s.status === status);
  }

  // Search by name
  if (search) {
    const searchLower = search.toLowerCase();
    systems = systems.filter(s => 
      s.systemName.toLowerCase().includes(searchLower) ||
      s.description.toLowerCase().includes(searchLower)
    );
  }

  res.json({
    total: systems.length,
    systems,
    timestamp: Date.now()
  });
});

/**
 * GET /admin/systems/:systemName
 * Get details for a specific system
 */
router.get('/:systemName', (req, res) => {
  const { systemName } = req.params;
  const system = mockSystems.find(s => s.systemName === systemName);

  if (!system) {
    return res.status(404).json({ 
      error: 'Not Found',
      message: `System '${systemName}' not found`
    });
  }

  res.json({
    system,
    timestamp: Date.now()
  });
});

/**
 * POST /admin/systems/:systemName/heartbeat
 * Send heartbeat for a system
 */
router.post('/:systemName/heartbeat', (req, res) => {
  const { systemName } = req.params;
  const system = mockSystems.find(s => s.systemName === systemName);

  if (!system) {
    return res.status(404).json({ 
      error: 'Not Found',
      message: `System '${systemName}' not found`
    });
  }

  system.lastHeartbeat = Date.now();
  system.status = 'active';

  res.json({
    message: 'Heartbeat received',
    system: systemName,
    timestamp: Date.now()
  });
});

/**
 * GET /admin/systems/stats/summary
 * Get system statistics summary
 */
router.get('/stats/summary', (req, res) => {
  const total = mockSystems.length;
  const active = mockSystems.filter(s => s.status === 'active').length;
  const inactive = mockSystems.filter(s => s.status === 'inactive').length;
  const errors = mockSystems.filter(s => s.status === 'error').length;

  const byCategory = {};
  mockSystems.forEach(s => {
    byCategory[s.category] = (byCategory[s.category] || 0) + 1;
  });

  res.json({
    total,
    active,
    inactive,
    errors,
    byCategory,
    timestamp: Date.now()
  });
});

module.exports = router;
