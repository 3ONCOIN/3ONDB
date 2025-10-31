#!/usr/bin/env node

/**
 * Example Usage Script for 3ONDB
 * 
 * This script demonstrates how to interact with the 3ONDB API
 */

const axios = require('axios');
const WebSocket = require('ws');

const API_BASE = 'http://localhost:3000/api';
const WS_URL = 'ws://localhost:3000/ws/analytics';

let authToken = null;

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null) {
  const config = {
    method,
    url: `${API_BASE}${endpoint}`,
    headers: {},
  };

  if (authToken) {
    config.headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (data) {
    config.headers['Content-Type'] = 'application/json';
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

// 1. Register a new user
async function registerUser() {
  console.log('\n=== Registering User ===');
  const result = await apiRequest('POST', '/users/register', {
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPassword123!',
  });

  if (result && result.success) {
    authToken = result.data.token;
    console.log('✓ User registered successfully');
    console.log('  User ID:', result.data.user.id);
    console.log('  Token:', authToken.substring(0, 20) + '...');
  }
}

// 2. Login
async function loginUser() {
  console.log('\n=== Logging In ===');
  const result = await apiRequest('POST', '/users/login', {
    email: 'test@example.com',
    password: 'TestPassword123!',
  });

  if (result && result.success) {
    authToken = result.data.token;
    console.log('✓ Logged in successfully');
    console.log('  User:', result.data.user.username);
  }
}

// 3. Execute a query
async function executeQuery() {
  console.log('\n=== Executing Query ===');
  const result = await apiRequest('POST', '/query', {
    query: 'SELECT * FROM users WHERE is_active = $1 LIMIT 5',
    params: [true],
    database: 'postgres',
  });

  if (result && result.success) {
    console.log('✓ Query executed successfully');
    console.log('  Rows returned:', result.rowCount);
    console.log('  Execution time:', result.executionTime, 'ms');
    console.log('  Database:', result.database);
  }
}

// 4. Get query statistics
async function getQueryStats() {
  console.log('\n=== Query Statistics ===');
  const result = await apiRequest('GET', '/query/stats?timeRange=24h');

  if (result && result.success) {
    console.log('✓ Statistics retrieved');
    result.data.forEach(stat => {
      console.log(`  ${stat.query_type}: ${stat.count} queries, avg ${stat.avg_time}ms`);
    });
  }
}

// 5. Get system status
async function getSystemStatus() {
  console.log('\n=== System Status ===');
  const result = await apiRequest('GET', '/system/status');

  if (result && result.success) {
    console.log('✓ System is', result.data.status);
    console.log('  Services:');
    console.log('    - AI Repair:', result.data.services.aiRepair ? '✓' : '✗');
    console.log('    - Mirroring:', result.data.services.mirroring ? '✓' : '✗');
    console.log('    - Backup:', result.data.services.backup ? '✓' : '✗');
  }
}

// 6. Get storage metrics
async function getStorageMetrics() {
  console.log('\n=== Storage Metrics ===');
  const result = await apiRequest('GET', '/system/storage/metrics');

  if (result && result.success) {
    const tier = result.data.tier;
    console.log('✓ Current tier:', tier.name);
    console.log('  Usage:', tier.usagePercent.toFixed(2) + '%');
    console.log('  Connections:', tier.metrics.connections);
    console.log('  Queries:', tier.metrics.queries);
  }
}

// 7. Create a backup
async function createBackup() {
  console.log('\n=== Creating Backup ===');
  const result = await apiRequest('POST', '/backup');

  if (result && result.success) {
    console.log('✓', result.message);
  }
}

// 8. Get sync status
async function getSyncStatus() {
  console.log('\n=== Sync Status ===');
  const result = await apiRequest('GET', '/sync/status');

  if (result && result.success) {
    console.log('✓ Mirroring is', result.data.isEnabled ? 'enabled' : 'disabled');
    if (result.data.history.length > 0) {
      const latest = result.data.history[0];
      console.log('  Latest sync:');
      console.log('    - Records synced:', latest.records_synced);
      console.log('    - Status:', latest.status);
      console.log('    - Time:', latest.started_at);
    }
  }
}

// 9. Connect to WebSocket for real-time updates
function connectWebSocket() {
  console.log('\n=== WebSocket Connection ===');
  
  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('✓ Connected to analytics stream');
    
    // Send a ping
    ws.send(JSON.stringify({ type: 'ping' }));
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    if (message.type === 'pong') {
      console.log('  Received pong from server');
    } else if (message.type === 'metrics_update') {
      console.log('  Metrics update received:');
      console.log('    - Queries in buffer:', message.data.queries.length);
      console.log('    - Last update:', message.data.lastUpdate);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
  });

  ws.on('close', () => {
    console.log('  WebSocket connection closed');
  });

  // Close connection after 5 seconds
  setTimeout(() => {
    ws.close();
  }, 5000);
}

// Main execution
async function main() {
  console.log('=================================');
  console.log('  3ONDB API Usage Examples');
  console.log('=================================');

  try {
    // Try to register, if fails try to login
    await registerUser();
    if (!authToken) {
      await loginUser();
    }

    if (authToken) {
      await executeQuery();
      await getQueryStats();
      await createBackup();
      await getSyncStatus();
    }

    await getSystemStatus();
    await getStorageMetrics();

    // WebSocket demo
    connectWebSocket();

    // Wait for WebSocket demo to complete
    await new Promise(resolve => setTimeout(resolve, 6000));

    console.log('\n=================================');
    console.log('  Examples completed!');
    console.log('=================================\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { apiRequest };
