# 3ONDB Quick Start Guide

Get up and running with 3ONDB in 5 minutes!

## Prerequisites

Before you begin, ensure you have:
- **Node.js** >= 18.x installed
- **PostgreSQL** >= 12.x (optional, but recommended for full features)
- **SQLite3** (usually comes with Node.js)

## Installation

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/3ONCOIN/3ONDB.git
cd 3ONDB

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your preferred text editor
nano .env  # or vim, code, etc.
```

**Minimum Configuration:**

For a quick start without PostgreSQL, you can use SQLite only:

```env
NODE_ENV=development
PORT=3000
STORAGE_TIER=CORE_NODE

# Disable PostgreSQL-dependent features if PG is not available
MIRROR_ENABLED=false
AI_REPAIR_ENABLED=false
BACKUP_ENABLED=false
```

**With PostgreSQL:**

If you have PostgreSQL running locally:

```env
NODE_ENV=development
PORT=3000
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=3ondb
PG_USER=postgres
PG_PASSWORD=your_password

MIRROR_ENABLED=true
AI_REPAIR_ENABLED=true
BACKUP_ENABLED=true
```

### 3. Setup PostgreSQL (Optional)

If you're using PostgreSQL, create the database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE 3ondb;

# Exit
\q
```

The tables will be created automatically when the server starts.

### 4. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

You should see:
```
3ONDB Server running on http://localhost:3000
WebSocket available on ws://localhost:3000/ws/analytics
Environment: development
Storage Tier: CORE_NODE
```

## First Steps

### 1. Check Server Status

Open your browser or use curl:

```bash
curl http://localhost:3000/
```

Response:
```json
{
  "name": "3ONDB",
  "version": "1.0.0",
  "description": "Quantum Database Engine powering the 3ON ecosystem",
  "status": "operational",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Register a User

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "SecurePassword123!"
  }'
```

Save the token from the response!

### 3. Execute Your First Query

```bash
# Replace YOUR_TOKEN with the token from registration
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "SELECT * FROM users LIMIT 5",
    "database": "postgres"
  }'
```

### 4. Get System Status

```bash
curl http://localhost:3000/api/system/status
```

### 5. View Storage Metrics

```bash
curl http://localhost:3000/api/system/storage/metrics
```

## Using the Example Script

We've included an example script that demonstrates all major features:

```bash
# Make sure the server is running, then in a new terminal:
node examples/usage.js
```

This will:
- Register/login a test user
- Execute sample queries
- Get system statistics
- Create a backup
- Check sync status
- Connect to WebSocket for real-time updates

## WebSocket Real-Time Analytics

Connect to the WebSocket endpoint for live metrics:

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws/analytics');

ws.on('open', () => {
  console.log('Connected!');
  ws.send(JSON.stringify({ type: 'ping' }));
});

ws.on('message', (data) => {
  const metrics = JSON.parse(data);
  console.log('Received:', metrics);
});
```

## Common Tasks

### Create a Backup

```bash
curl -X POST http://localhost:3000/api/backup \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Force Database Sync

```bash
curl -X POST http://localhost:3000/api/sync/force \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Trigger Health Check

```bash
curl -X POST http://localhost:3000/api/system/health/check
```

### Get Dashboard Data

```bash
curl http://localhost:3000/api/system/dashboard
```

## Troubleshooting

### "PostgreSQL connection failed"

If you see this warning, the server will continue with limited functionality. To fix:

1. Ensure PostgreSQL is installed and running
2. Check your `.env` configuration
3. Verify database credentials
4. Create the database if it doesn't exist

### "EADDRINUSE: address already in use"

Port 3000 is already in use. Either:
- Stop the other service using port 3000
- Change `PORT` in your `.env` file

### "Cannot find module"

Make sure you've run `npm install`:

```bash
npm install
```

## Next Steps

- Read the full [README.md](README.md) for detailed information
- Check [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete API reference
- Explore the `examples/` directory for more code samples
- Configure storage tiers for your use case
- Set up ecosystem integration with other 3ON services

## Production Deployment

For production:

1. Set `NODE_ENV=production` in `.env`
2. Use a strong `JWT_SECRET`
3. Configure proper PostgreSQL credentials
4. Set up SSL/TLS
5. Configure CORS appropriately
6. Set up monitoring and logging
7. Use a process manager like PM2:

```bash
npm install -g pm2
pm2 start src/server.js --name 3ondb
pm2 save
pm2 startup
```

## Need Help?

- Check the logs in `./logs/` directory
- Review [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- Check system status: `curl http://localhost:3000/api/system/status`

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   3ONDB Server                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐│
│  │ Express.js │  │ WebSocket  │  │  Services  ││
│  └────────────┘  └────────────┘  └────────────┘│
└─────────────────────────────────────────────────┘
           │                │              │
    ┌──────┴──────┐  ┌─────┴─────┐  ┌────┴────┐
    │  PostgreSQL │  │   SQLite   │  │ Storage │
    │   (Main)    │  │  (Cache)   │  │  Tiers  │
    └─────────────┘  └────────────┘  └─────────┘
           │                │
    ┌──────┴────────────────┴──────┐
    │   Real-time Mirroring        │
    │   AI Auto-Repair             │
    │   Backup Service             │
    │   Analytics Dashboard        │
    └──────────────────────────────┘
```

Happy coding with 3ONDB! 🚀
