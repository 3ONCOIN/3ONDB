require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

// Import routes
const systemsRouter = require('./routes/systems');
const metricsRouter = require('./routes/metrics');
const logsRouter = require('./routes/logs');
const upiRouter = require('./routes/upi');
const syncRouter = require('./routes/sync');

// Import middleware
const { authMiddleware } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from client
app.use(express.static(path.join(__dirname, '../client/public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: Date.now(),
    service: '3ONDB Admin Dashboard'
  });
});

// Admin API routes (protected)
app.use('/admin/systems', authMiddleware, systemsRouter);
app.use('/admin/metrics', authMiddleware, metricsRouter);
app.use('/admin/logs', authMiddleware, logsRouter);
app.use('/admin/upi', authMiddleware, upiRouter);
app.use('/admin/sync', authMiddleware, syncRouter);

// Serve dashboard on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/index.html'));
});

// WebSocket for live data streaming
wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');

  // Send initial connection message
  ws.send(JSON.stringify({ 
    type: 'connection', 
    message: 'Connected to 3ONDB Admin Dashboard',
    timestamp: Date.now()
  }));

  // Set up live metrics streaming
  const metricsInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'metrics',
        data: {
          requestsPerSec: Math.floor(Math.random() * 100) + 50,
          errors: Math.floor(Math.random() * 5),
          replicationLag: Math.floor(Math.random() * 100),
          activeConnections: Math.floor(Math.random() * 200) + 100,
          timestamp: Date.now()
        }
      }));
    }
  }, 1000);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      
      if (data.type === 'subscribe') {
        // Handle subscription requests
        ws.send(JSON.stringify({ 
          type: 'subscribed', 
          channel: data.channel 
        }));
      }
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });

  ws.on('close', () => {
    clearInterval(metricsInterval);
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clearInterval(metricsInterval);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 3ONDB Admin Dashboard server running on port ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/admin`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
});

module.exports = app;
