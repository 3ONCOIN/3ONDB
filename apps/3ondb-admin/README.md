# 3ONDB Admin Dashboard

Web-based administration interface for monitoring and managing the entire 3ON ecosystem through 3ONPRIME.

## Features

### 🎯 Core Features
- **System Monitoring**: Visualize all 40+ connected 3ON systems by category
- **Live Metrics**: Real-time dashboard with requests/sec, errors, replication lag
- **Event Bus Traffic**: WebSocket streaming for pub/sub traffic monitoring
- **Sync Status**: Monitor SQLite/PostgreSQL synchronization status
- **3ONUPI Sessions**: View active authentication sessions and auth logs
- **AI Auto-Repair**: Track error detection and repair actions
- **Role-Based Access**: GODMODE, ADMIN, and standard user permissions

### 📊 Admin APIs
- `GET /admin/systems` - List all 3ON systems
- `GET /admin/metrics` - Real-time metrics
- `GET /admin/logs` - System logs with filtering
- `GET /admin/upi` - 3ONUPI sessions and auth logs
- `GET /admin/sync` - Database sync status and history

### 🔐 Authentication
- **GODMODE**: `3ON-L3ON-0000-GODMODE` (unlimited access)
- **ADMIN**: `3ON-GOD-0101-CORE-9999` (administrative access)
- **Standard**: Any `3ONUPI-*` token (read-only)

## Installation

### Prerequisites
- Node.js 16+ and npm

### Quick Start

1. **Install dependencies**:
   ```bash
   cd apps/3ondb-admin
   npm install
   ```

2. **Configure environment** (optional):
   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

3. **Start the dashboard**:
   ```bash
   npm start
   ```

4. **Access the dashboard**:
   ```
   http://localhost:3001
   ```

### Development Mode

Run with auto-reload:
```bash
npm run dev:server
```

## API Usage

### Authentication

All admin API endpoints require authentication. Include the token in the `Authorization` header:

```bash
# GODMODE access
curl -H "Authorization: Bearer 3ON-L3ON-0000-GODMODE" \
     http://localhost:3001/admin/systems

# ADMIN access
curl -H "Authorization: Bearer 3ON-GOD-0101-CORE-9999" \
     http://localhost:3001/admin/metrics
```

### Example API Calls

**Get all systems**:
```bash
curl -H "Authorization: Bearer 3ON-L3ON-0000-GODMODE" \
     http://localhost:3001/admin/systems
```

**Get metrics**:
```bash
curl -H "Authorization: Bearer 3ON-L3ON-0000-GODMODE" \
     http://localhost:3001/admin/metrics
```

**Get storage metrics**:
```bash
curl -H "Authorization: Bearer 3ON-L3ON-0000-GODMODE" \
     http://localhost:3001/admin/metrics/storage
```

**Get logs**:
```bash
curl -H "Authorization: Bearer 3ON-L3ON-0000-GODMODE" \
     http://localhost:3001/admin/logs?level=error&limit=20
```

**Get 3ONUPI sessions**:
```bash
curl -H "Authorization: Bearer 3ON-L3ON-0000-GODMODE" \
     http://localhost:3001/admin/upi/sessions
```

**Get sync status**:
```bash
curl -H "Authorization: Bearer 3ON-L3ON-0000-GODMODE" \
     http://localhost:3001/admin/sync/status
```

## WebSocket Streaming

Connect to `ws://localhost:3001` for real-time metrics streaming:

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'metrics' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'metrics') {
    console.log('Requests/sec:', data.data.requestsPerSec);
    console.log('Errors:', data.data.errors);
    console.log('Replication lag:', data.data.replicationLag);
  }
};
```

## Dashboard Features

### System Grid
- Search and filter by category
- Live status indicators
- Heartbeat monitoring
- System versions and uptime

### Live Charts
- Real-time metrics visualization
- Requests per second
- Error rates
- Replication lag over time

### Activity Logs
- Recent system logs
- Error tracking
- Auto-repair actions
- Filterable by level and source

### Statistics Cards
- Total systems count
- Real-time request rate
- Replication lag
- Error rate percentage

## Project Structure

```
apps/3ondb-admin/
├── server/
│   ├── index.js              # Main server
│   ├── middleware/
│   │   └── auth.js           # Authentication middleware
│   ├── routes/
│   │   ├── systems.js        # Systems endpoints
│   │   ├── metrics.js        # Metrics endpoints
│   │   ├── logs.js           # Logs endpoints
│   │   ├── upi.js            # 3ONUPI endpoints
│   │   └── sync.js           # Sync endpoints
│   └── utils/
│       └── mockData.js       # Mock data for systems
├── client/
│   └── public/
│       └── index.html        # Dashboard UI
├── package.json
├── .env                      # Configuration
└── README.md                 # This file
```

## Environment Variables

```env
PORT=3001                     # Server port
NODE_ENV=development          # Environment
CORS_ORIGIN=*                 # CORS settings
LOG_LEVEL=info                # Logging level
```

## Role-Based Access Control

### GODMODE (3ON-L3ON-0000-GODMODE)
- All permissions (*)
- Full system access
- Can perform any operation

### ADMIN (3ON-GOD-0101-CORE-9999)
- admin, manage, configure, monitor, audit
- System management
- Cannot modify core configurations

### STANDARD (3ONUPI-*)
- read
- View-only access
- No modifications allowed

## Security Notes

1. **Authentication Required**: All `/admin/*` endpoints require valid tokens
2. **Token Validation**: Tokens are verified against 3ONUPI standards
3. **Role Enforcement**: Operations are restricted based on role permissions
4. **WebSocket Security**: Consider adding authentication for production WebSocket connections

## Development

### Adding New Routes

1. Create route file in `server/routes/`:
```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  // Your logic here
  res.json({ success: true });
});

module.exports = router;
```

2. Register in `server/index.js`:
```javascript
const myRouter = require('./routes/myroute');
app.use('/admin/myroute', authMiddleware, myRouter);
```

### Testing

Test API endpoints:
```bash
# Health check (no auth required)
curl http://localhost:3001/health

# Systems (requires auth)
curl -H "Authorization: Bearer 3ON-L3ON-0000-GODMODE" \
     http://localhost:3001/admin/systems

# Metrics
curl -H "Authorization: Bearer 3ON-L3ON-0000-GODMODE" \
     http://localhost:3001/admin/metrics
```

## Integration with 3ONDB

The dashboard integrates with the main 3ONDB engine to provide real-time monitoring. Future enhancements can connect directly to the QuantumDB instance for live data instead of mock data.

## Troubleshooting

### Port Already in Use
```bash
# Change port in .env
PORT=3002
```

### WebSocket Connection Failed
- Check firewall settings
- Ensure server is running
- Verify WebSocket URL in client code

### Authentication Failures
- Verify token format
- Check token in Authorization header
- Ensure token is valid (GODMODE, ADMIN, or 3ONUPI-*)

## Future Enhancements

- [ ] Real database integration (SQLite/PostgreSQL)
- [ ] User management interface
- [ ] Advanced filtering and search
- [ ] Export logs and metrics
- [ ] Alert configuration
- [ ] Performance optimization
- [ ] Docker containerization
- [ ] Kubernetes deployment configs

## License

MIT

## Support

For issues and questions, please refer to the main 3ONDB repository.
