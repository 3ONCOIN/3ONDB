# 3ONDB API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All responses follow this format:

```json
{
  "success": true|false,
  "data": { ... },      // Present on success
  "error": "message"    // Present on error
}
```

---

## User Endpoints

### Register User
**POST** `/users/register`

Register a new user account.

**Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token"
  }
}
```

### Login User
**POST** `/users/login`

Authenticate and receive a JWT token.

**Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "token": "jwt-token"
  }
}
```

### List Users
**GET** `/users?limit=50&offset=0`

List all users (requires authentication).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "created_at": "2024-01-01T00:00:00.000Z",
      "is_active": true
    }
  ],
  "count": 1
}
```

### Get User
**GET** `/users/:id`

Get a specific user by ID (requires authentication).

### Update User
**PUT** `/users/:id`

Update user information (requires authentication).

**Body:**
```json
{
  "username": "newusername",
  "email": "newemail@example.com",
  "metadata": { "key": "value" }
}
```

### Delete User
**DELETE** `/users/:id`

Soft delete a user (requires authentication).

---

## Query Endpoints

### Execute Query
**POST** `/query`

Execute a SQL query on either PostgreSQL or SQLite.

**Body:**
```json
{
  "query": "SELECT * FROM users WHERE is_active = $1",
  "params": [true],
  "database": "postgres"  // or "sqlite"
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "rowCount": 10,
  "executionTime": 45,
  "database": "postgres"
}
```

### Get Query Logs
**GET** `/query/logs?limit=50&offset=0&userId=uuid&status=success`

Get query execution logs.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "query_text": "SELECT * FROM users",
      "query_type": "SELECT",
      "execution_time_ms": 45,
      "status": "success",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Query Stats
**GET** `/query/stats?timeRange=24h`

Get query statistics for a time range.

**Query Parameters:**
- `timeRange`: `1h`, `24h`, `7d`, `30d`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "query_type": "SELECT",
      "count": 100,
      "avg_time": 45.5,
      "max_time": 200,
      "min_time": 10,
      "success_count": 98,
      "error_count": 2
    }
  ],
  "timeRange": "24h"
}
```

---

## Backup Endpoints

### Create Backup
**POST** `/backup`

Initiate a database backup (requires authentication).

**Response:**
```json
{
  "success": true,
  "message": "Backup initiated successfully"
}
```

### List Backups
**GET** `/backup?limit=20`

List all backups (requires authentication).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "backup_name": "postgres_backup_2024-01-01.sql",
      "backup_type": "postgres",
      "file_path": "/path/to/backup",
      "file_size": 1024000,
      "status": "completed",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Restore Backup
**POST** `/backup/:backupId/restore`

Restore from a backup (requires authentication).

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Backup file found. Manual restoration required for production safety.",
    "backup": { ... }
  }
}
```

---

## Sync Endpoints

### Get Sync Status
**GET** `/sync/status`

Get database synchronization status.

**Response:**
```json
{
  "success": true,
  "data": {
    "isEnabled": true,
    "history": [
      {
        "id": "uuid",
        "source_db": "postgres",
        "target_db": "sqlite",
        "sync_type": "periodic",
        "records_synced": 150,
        "status": "completed",
        "started_at": "2024-01-01T00:00:00.000Z",
        "completed_at": "2024-01-01T00:00:01.000Z"
      }
    ]
  }
}
```

### Force Sync
**POST** `/sync/force`

Force immediate synchronization (requires authentication).

**Body (optional):**
```json
{
  "table": "users"  // Sync specific table, or omit for full sync
}
```

**Response:**
```json
{
  "success": true,
  "message": "Synced 150 records for table users"
}
```

---

## System Endpoints

### System Status
**GET** `/system/status`

Get overall system status and metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "services": {
      "aiRepair": true,
      "mirroring": true,
      "backup": true
    },
    "health": [...],
    "sync": [...],
    "storage": {...},
    "analytics": {...},
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Health Report
**GET** `/system/health`

Get data health check reports.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "table_name": "users",
      "check_type": "integrity_check",
      "status": "healthy",
      "issues_found": 0,
      "issues_fixed": 0,
      "checked_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Force Health Check
**POST** `/system/health/check`

Trigger immediate health check.

### Dashboard Data
**GET** `/system/dashboard`

Get complete dashboard data for monitoring.

**Response:**
```json
{
  "success": true,
  "data": {
    "queries": [...],
    "health": [...],
    "sync": [...],
    "storage": {...},
    "realtime": {...},
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Analytics Summary
**GET** `/system/analytics?timeRange=24h`

Get analytics summary for a time range.

**Query Parameters:**
- `timeRange`: `1h`, `24h`, `7d`, `30d`

**Response:**
```json
{
  "success": true,
  "data": {
    "unique_users": 50,
    "total_queries": 1000,
    "avg_query_time": 45.5,
    "successful_queries": 980,
    "failed_queries": 20
  }
}
```

### Storage Tiers
**GET** `/system/storage/tiers`

List all available storage tiers.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "CORE_NODE",
      "config": {
        "maxSize": 10737418240,
        "maxConnections": 100,
        "replication": 1
      },
      "isCurrent": true
    }
  ]
}
```

### Current Storage Tier
**GET** `/system/storage/current`

Get current storage tier information.

### Storage Metrics
**GET** `/system/storage/metrics`

Get detailed storage metrics and scaling recommendations.

**Response:**
```json
{
  "success": true,
  "data": {
    "tier": {
      "name": "CORE_NODE",
      "config": {...},
      "metrics": {
        "usedSize": 1073741824,
        "totalSize": 10737418240,
        "connections": 10,
        "queries": 100
      },
      "usagePercent": 10
    },
    "capacity": [...],
    "scaling": {
      "action": "none",
      "recommended": true,
      "currentTier": "CORE_NODE",
      "reason": "Operating within normal parameters"
    }
  }
}
```

---

## WebSocket API

### Analytics Stream
**WebSocket** `/ws/analytics`

Connect to receive real-time analytics updates.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/analytics');

ws.onopen = () => {
  console.log('Connected to analytics stream');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Metrics update:', data);
};
```

**Message Format:**
```json
{
  "type": "metrics_update",
  "data": {
    "queries": [...],
    "connections": 10,
    "storageUsed": 1073741824,
    "lastUpdate": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Client Messages:**
```json
{
  "type": "ping"
}
```

**Server Response:**
```json
{
  "type": "pong",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Error Codes

- `400` - Bad Request: Invalid parameters
- `401` - Unauthorized: Missing or invalid authentication
- `404` - Not Found: Resource does not exist
- `409` - Conflict: Resource already exists
- `500` - Internal Server Error: Server-side error

---

## Rate Limiting

Currently, there is no rate limiting implemented. This should be added for production use.

---

## Examples

### Example: Execute Query with Authentication

```bash
# Login first
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Use the token from response
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "SELECT * FROM users WHERE is_active = $1",
    "params": [true],
    "database": "postgres"
  }'
```

### Example: WebSocket Connection

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws/analytics');

ws.on('open', function open() {
  console.log('Connected');
  
  // Send ping
  ws.send(JSON.stringify({ type: 'ping' }));
});

ws.on('message', function message(data) {
  const parsed = JSON.parse(data);
  console.log('Received:', parsed);
});
```
