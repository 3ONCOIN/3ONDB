const path = require('path');
require('dotenv').config();

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const required = ['JWT_SECRET'];
  const missing = required.filter(key => !process.env[key] || process.env[key] === 'your-secret-key-change-this-in-production');
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
  }
}

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
  },

  postgres: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT) || 5432,
    database: process.env.PG_DATABASE || '3ondb',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    max: parseInt(process.env.PG_MAX_POOL) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  sqlite: {
    filename: process.env.SQLITE_DB_PATH || path.join(__dirname, '../../data/sqlite/3ondb.db'),
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  websocket: {
    port: parseInt(process.env.WS_PORT) || 3001,
  },

  storage: {
    tier: process.env.STORAGE_TIER || 'CORE_NODE',
    tiers: {
      CORE_NODE: {
        maxSize: 1024 * 1024 * 1024 * 10, // 10GB
        maxConnections: 100,
        replication: 1,
      },
      CLUSTER: {
        maxSize: 1024 * 1024 * 1024 * 100, // 100GB
        maxConnections: 1000,
        replication: 3,
      },
      DATA_CENTER_GRID: {
        maxSize: 1024 * 1024 * 1024 * 1000, // 1TB
        maxConnections: 10000,
        replication: 5,
      },
      PLANETARY: {
        maxSize: 1024 * 1024 * 1024 * 1024, // 1PB
        maxConnections: 100000,
        replication: 10,
      },
      QUANTUM_EXPANSION: {
        maxSize: 1024 * 1024 * 1024 * 1024 * 1024, // 1EB
        maxConnections: 1000000,
        replication: 20,
      },
    },
  },

  ai: {
    repairEnabled: process.env.AI_REPAIR_ENABLED === 'true',
    repairInterval: parseInt(process.env.AI_REPAIR_INTERVAL) || 300000,
    repairThreshold: parseFloat(process.env.AI_REPAIR_THRESHOLD) || 0.8,
  },

  mirroring: {
    enabled: process.env.MIRROR_ENABLED === 'true',
    interval: parseInt(process.env.MIRROR_INTERVAL) || 5000,
    batchSize: parseInt(process.env.MIRROR_BATCH_SIZE) || 100,
  },

  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    interval: parseInt(process.env.BACKUP_INTERVAL) || 3600000,
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    path: path.join(__dirname, '../../data/backups'),
  },

  analytics: {
    enabled: process.env.ANALYTICS_ENABLED === 'true',
    bufferSize: parseInt(process.env.ANALYTICS_BUFFER_SIZE) || 1000,
  },

  ecosystem: {
    coreUrl: process.env.API_3ONCORE_URL || 'http://localhost:4000',
    payUrl: process.env.API_3ONPAY_URL || 'http://localhost:4001',
    cashUrl: process.env.API_3ONCASH_URL || 'http://localhost:4002',
    chatUrl: process.env.API_3ONCHAT_URL || 'http://localhost:4003',
    aireUrl: process.env.API_3ONAIRE_URL || 'http://localhost:4004',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    path: path.join(__dirname, '../../logs'),
  },
};
