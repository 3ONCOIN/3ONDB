# 3ONDB - Quantum Database Engine

The official 3ONDB – Quantum Database Engine powering the 3ON ecosystem.

## 🚀 Features

- **Dual Database Architecture**: PostgreSQL for production + SQLite for local caching
- **AI-Based Auto-Repair**: Automatic detection and repair of data integrity issues
- **Real-Time Mirroring**: Bidirectional synchronization between SQLite and PostgreSQL
- **Live Analytics Dashboard**: WebSocket-based real-time monitoring
- **Comprehensive APIs**: CRUD operations for queries, backups, users, and sync
- **Scalable Storage Tiers**: From Core Node to Quantum Expansion
- **Ecosystem Integration**: Ready to connect with 3ONCORE, 3ONPAY, 3ONCASH, 3ONCHAT, and 3ONAIRE

## 📋 Storage Tiers

1. **Core Node**: 10GB storage, 100 connections
2. **Cluster**: 100GB storage, 1,000 connections
3. **Data-Center Grid**: 1TB storage, 10,000 connections
4. **Planetary**: 1PB storage, 100,000 connections
5. **Quantum Expansion**: 1EB storage, 1,000,000 connections

## 🛠️ Installation

### Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 12.x (optional but recommended)
- SQLite3

### Setup

1. Clone the repository:
```bash
git clone https://github.com/3ONCOIN/3ONDB.git
cd 3ONDB
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## 🔧 Configuration

Edit `.env` file to configure:

- **Server Settings**: Port, host, environment
- **PostgreSQL**: Connection details
- **SQLite**: Database path
- **Security**: JWT secrets
- **Features**: Enable/disable AI repair, mirroring, backups
- **Storage Tier**: Set your current tier
- **Ecosystem URLs**: Connect to other 3ON services

## 📡 API Endpoints

### Query Operations
- `POST /api/query` - Execute SQL queries
- `GET /api/query/logs` - Get query execution logs
- `GET /api/query/stats` - Get query statistics

### User Management
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users` - List users (authenticated)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Backup Operations
- `POST /api/backup` - Create backup
- `GET /api/backup` - List backups
- `POST /api/backup/:id/restore` - Restore backup

### Sync Operations
- `GET /api/sync/status` - Get sync status
- `POST /api/sync/force` - Force synchronization

### System Monitoring
- `GET /api/system/status` - System status overview
- `GET /api/system/health` - Health check reports
- `GET /api/system/dashboard` - Dashboard data
- `GET /api/system/analytics` - Analytics summary
- `GET /api/system/storage/tiers` - Storage tier information
- `GET /api/system/storage/metrics` - Storage metrics

### WebSocket
- `ws://localhost:3000/ws/analytics` - Real-time analytics stream

## 📊 Real-Time Analytics

Connect to the WebSocket endpoint to receive real-time metrics:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/analytics');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Metrics update:', data);
};
```

## 🔐 Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🤖 AI Auto-Repair

The system automatically:
- Detects duplicate entries
- Finds orphaned records
- Checks data integrity
- Repairs issues automatically
- Logs all repair actions

## 🔄 Database Mirroring

Real-time bidirectional synchronization between PostgreSQL and SQLite:
- Automatic sync every 5 seconds (configurable)
- Batch processing for efficiency
- Conflict resolution
- Sync history tracking

## 💾 Backup System

Automated backup system:
- Scheduled backups (configurable interval)
- PostgreSQL pg_dump support
- SQLite file-based backups
- Retention policy (default 30 days)
- Easy restoration

## 🏗️ Project Structure

```
3ONDB/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # API controllers
│   ├── middleware/      # Express middleware
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   │   ├── analytics/   # Analytics service
│   │   ├── backup/      # Backup service
│   │   ├── mirroring/   # Mirroring service
│   │   └── repair/      # AI repair service
│   ├── storage/         # Storage tier management
│   ├── utils/           # Utility functions
│   └── server.js        # Main server file
├── data/                # Database files
│   ├── sqlite/          # SQLite databases
│   ├── postgres/        # PostgreSQL data (if local)
│   └── backups/         # Backup files
├── logs/                # Application logs
├── .env.example         # Environment template
├── package.json         # Dependencies
└── README.md           # This file
```

## 🔗 Ecosystem Integration

Connect to other 3ON services via environment variables:

```env
API_3ONCORE_URL=http://localhost:4000
API_3ONPAY_URL=http://localhost:4001
API_3ONCASH_URL=http://localhost:4002
API_3ONCHAT_URL=http://localhost:4003
API_3ONAIRE_URL=http://localhost:4004
```

## 🧪 Development

```bash
# Start in development mode
npm run dev

# The server will automatically reload on code changes
```

## 📝 License

See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For support, please contact the 3ONCOIN team.
 
