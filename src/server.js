const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config');
const logger = require('./utils/logger');
const postgres = require('./config/postgres');
const sqlite = require('./config/sqlite');

// Services
const aiRepairService = require('./services/repair/aiRepair');
const mirroringService = require('./services/mirroring/mirrorService');
const backupService = require('./services/backup/backupService');
const analyticsService = require('./services/analytics/analyticsService');
const storageTierManager = require('./storage/storageTierManager');

// Routes
const queryRoutes = require('./routes/query');
const userRoutes = require('./routes/users');
const backupRoutes = require('./routes/backup');
const syncRoutes = require('./routes/sync');
const systemRoutes = require('./routes/system');

class Server {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = null;
  }

  async initialize() {
    try {
      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Connect to databases
      await this.connectDatabases();

      // Start services
      await this.startServices();

      // Setup WebSocket server
      this.setupWebSocket();

      // Setup error handling
      this.setupErrorHandling();

      logger.info('Server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // Security
    this.app.use(helmet());
    
    // CORS - Configure based on environment
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : [];
    
    const corsOptions = {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        // In development, allow any origin
        if (config.server.env !== 'production') {
          return callback(null, true);
        }
        
        // In production, check whitelist
        if (allowedOrigins.length === 0) {
          // No origins configured - reject all CORS requests in production
          logger.warn('No ALLOWED_ORIGINS configured for production', { origin });
          return callback(new Error('Not allowed by CORS'));
        }
        
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        } else {
          logger.warn('CORS request from unauthorized origin', { origin });
          return callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    };
    this.app.use(cors(corsOptions));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Logging
    this.app.use(morgan('combined', { stream: logger.stream }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/', (req, res) => {
      res.json({
        name: '3ONDB',
        version: '1.0.0',
        description: 'Quantum Database Engine powering the 3ON ecosystem',
        status: 'operational',
        timestamp: new Date().toISOString(),
      });
    });

    // API routes
    this.app.use('/api/query', queryRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/backup', backupRoutes);
    this.app.use('/api/sync', syncRoutes);
    this.app.use('/api/system', systemRoutes);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
      });
    });
  }

  async connectDatabases() {
    logger.info('Connecting to databases...');
    
    try {
      await postgres.connect();
      logger.info('PostgreSQL connected');
    } catch (error) {
      logger.error('Failed to connect to PostgreSQL:', error);
      logger.warn('Continuing without PostgreSQL - some features may be limited');
    }

    try {
      await sqlite.connect();
      logger.info('SQLite connected');
    } catch (error) {
      logger.error('Failed to connect to SQLite:', error);
      logger.warn('Continuing without SQLite - some features may be limited');
    }
  }

  async startServices() {
    logger.info('Starting services...');

    // Start AI repair service
    if (config.ai.repairEnabled) {
      aiRepairService.start();
    }

    // Start mirroring service
    if (config.mirroring.enabled) {
      mirroringService.start();
    }

    // Start backup service
    if (config.backup.enabled) {
      await backupService.start();
    }

    // Start storage metrics collection
    setInterval(async () => {
      await storageTierManager.updateMetrics();
      
      const metrics = storageTierManager.getCurrentTier();
      await analyticsService.trackMetrics({
        totalSize: metrics.metrics.totalSize,
        usedSize: metrics.metrics.usedSize,
        connections: metrics.metrics.connections,
        queryCount: metrics.metrics.queries,
      });
    }, 60000); // Every minute

    logger.info('All services started');
  }

  setupWebSocket() {
    this.wss = new WebSocket.Server({ 
      server: this.server,
      path: '/ws/analytics',
    });

    this.wss.on('connection', (ws, req) => {
      logger.info('WebSocket client connected', { ip: req.socket.remoteAddress });

      // Register client for analytics updates
      analyticsService.registerClient(ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          logger.debug('WebSocket message received:', data);

          // Handle client requests
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          logger.error('WebSocket message error:', error);
        }
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
      });
    });

    logger.info('WebSocket server initialized');
  }

  setupErrorHandling() {
    // Express error handler
    this.app.use((err, req, res, next) => {
      logger.error('Express error:', err);
      
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
      });
    });

    // Process error handlers
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      this.shutdown(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown(0);
    });
  }

  async start() {
    try {
      await this.initialize();

      this.server.listen(config.server.port, config.server.host, () => {
        logger.info(`3ONDB Server running on http://${config.server.host}:${config.server.port}`);
        logger.info(`WebSocket available on ws://${config.server.host}:${config.server.port}/ws/analytics`);
        logger.info(`Environment: ${config.server.env}`);
        logger.info(`Storage Tier: ${config.storage.tier}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown(code = 0) {
    logger.info('Shutting down server...');

    try {
      // Stop services
      aiRepairService.stop();
      mirroringService.stop();
      backupService.stop();

      // Close WebSocket connections
      if (this.wss) {
        this.wss.clients.forEach(client => {
          client.close();
        });
        this.wss.close();
      }

      // Close database connections
      await postgres.close();
      await sqlite.close();

      // Close HTTP server
      this.server.close(() => {
        logger.info('Server shut down complete');
        process.exit(code);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(code);
      }, 10000);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Create and start server
const server = new Server();
server.start();

module.exports = server;
