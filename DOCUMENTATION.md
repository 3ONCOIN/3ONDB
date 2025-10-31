# 3ONDB Documentation

Complete documentation for the Quantum Database Engine.

## Table of Contents

1. [Architecture](#architecture)
2. [Storage Tiers](#storage-tiers)
3. [AI-Based Auto-Repair](#ai-based-auto-repair)
4. [Real-Time Sync](#real-time-sync)
5. [Integration Hub](#integration-hub)
6. [API Reference](#api-reference)
7. [Best Practices](#best-practices)

## Architecture

3ONDB is built with a modular architecture consisting of four main components:

### Core Components

1. **Storage Tier Manager**: Manages infinite storage tiers (HOT, WARM, COLD, ARCHIVE)
2. **Auto-Repair System**: AI-based health monitoring and self-healing
3. **Sync Manager**: Real-time synchronization across peers
4. **Integration Hub**: Universal connectivity for 3ON ecosystem apps

## Storage Tiers

### Tier Characteristics

| Tier | Access Speed | Use Case | Storage Type |
|------|-------------|----------|--------------|
| HOT | Fastest | Frequently accessed data | In-memory |
| WARM | Fast | Regular access | SSD-equivalent |
| COLD | Moderate | Infrequent access | HDD-equivalent |
| ARCHIVE | Slow | Rare access | Object storage |

### Automatic Tier Management

Data automatically moves between tiers based on:
- **Access frequency**: More accesses = hotter tier
- **Time since last access**: Older = colder tier
- **Memory constraints**: HOT tier has size limits

```typescript
// Default tiering policy
const defaultPolicy = {
  hotThreshold: 100,      // ≥100 accesses = HOT tier
  warmThreshold: 10,      // ≥10 accesses = WARM tier
  coldThreshold: 30,      // 30 days without access = COLD tier
  archiveThreshold: 90    // 90 days without access = ARCHIVE tier
};
```

### Manual Tier Control

```typescript
// Store directly in specific tier
await db.set('key', value, StorageTier.ARCHIVE);

// Force tier optimization
const movedCount = await db.optimizeTiers();
```

## AI-Based Auto-Repair

### Health Monitoring

The auto-repair system continuously monitors:

1. **Checksum Integrity**: Detects data corruption
2. **Metadata Consistency**: Validates size, timestamps
3. **Access Patterns**: Identifies anomalies

```typescript
// Manual health check
const health = await db.healthCheck();

if (health.status === HealthStatus.CRITICAL) {
  console.log('Critical issues detected:', health.issues);
  console.log('Suggested actions:', health.repairActions);
}
```

### Self-Healing

When `enableAutoRepair` is enabled:

```typescript
const db = new QuantumDB({
  name: 'my-db',
  enableAutoRepair: true  // Enable automatic repairs
});
```

The system automatically:
- Verifies checksums on data access
- Repairs metadata inconsistencies
- Restores from backups when available
- Logs all repair actions

### Repair Statistics

```typescript
const stats = db.getStats();
console.log(stats.repair.totalRepairs);
console.log(stats.repair.corruptedRecords);
```

## Real-Time Sync

### Sync Architecture

3ONDB uses a queue-based sync system with configurable intervals:

```typescript
const db = new QuantumDB({
  name: 'my-db',
  enableSync: true,
  syncInterval: 5000  // Sync every 5 seconds
});
```

### Peer Management

```typescript
// Add peers for synchronization
db.addPeer('peer-node-1');
db.addPeer('peer-node-2');
db.addPeer('peer-node-3');

// Remove peer
db.removePeer('peer-node-1');

// Check peer status
const status = db.getSyncStatus();
console.log(`Connected to ${status.peers} peers`);
```

### Sync Events

```typescript
import { SyncManager } from '3ondb';

const syncManager = new SyncManager();

// Listen for sync events
syncManager.on('sync:started', () => {
  console.log('Synchronization started');
});

syncManager.on('sync:completed', (recordKey) => {
  console.log(`Record ${recordKey} synchronized`);
});

syncManager.on('sync:error', (recordKey, error) => {
  console.error(`Sync failed for ${recordKey}:`, error);
});

syncManager.on('peer:added', (peerId) => {
  console.log(`New peer connected: ${peerId}`);
});

syncManager.on('peer:removed', (peerId) => {
  console.log(`Peer disconnected: ${peerId}`);
});
```

### Force Sync

```typescript
// Trigger immediate sync
const result = await db.sync();

console.log(`Synced ${result.recordsSynced} records`);
console.log(`Success: ${result.success}`);
if (result.errors.length > 0) {
  console.log('Errors:', result.errors);
}
```

## Integration Hub

### Built-in Connectors

3ONDB includes connectors for the 3ON ecosystem:

#### 3ONCORE Connector

```typescript
// Connect to 3ONCORE
await db.connectApp('3ONCORE');

// Query data
const coreData = await db.queryApp('3ONCORE', {
  limit: 10,
  sortBy: 'timestamp'
});

// Write data
const id = await db.writeApp('3ONCORE', {
  type: 'user',
  data: { name: 'Alice' }
});
```

#### 3ONCHAIN Connector

```typescript
// Connect to blockchain
await db.connectApp('3ONCHAIN');

// Query blockchain data
const transactions = await db.queryApp('3ONCHAIN', {
  limit: 100
});

// Write to blockchain
const txId = await db.writeApp('3ONCHAIN', {
  transaction: {
    from: 'address1',
    to: 'address2',
    amount: 100
  }
});
```

#### 3ONPAY Connector

```typescript
// Connect to payment system
await db.connectApp('3ONPAY');

// Query payments
const payments = await db.queryApp('3ONPAY', {
  limit: 50
});

// Process payment
const paymentId = await db.writeApp('3ONPAY', {
  amount: 99.99,
  currency: 'USD',
  recipient: 'user@example.com'
});
```

### Custom Connectors

Create your own connectors:

```typescript
import { BaseConnector, QueryOptions, DataRecord } from '3ondb';

export class MyCustomConnector extends BaseConnector {
  appName = 'MyCustomApp';

  async connect(): Promise<boolean> {
    // Custom connection logic
    await super.connect();
    return true;
  }

  async query(options: QueryOptions): Promise<DataRecord[]> {
    if (!this.connected) {
      throw new Error('Not connected');
    }
    
    // Your query implementation
    return [];
  }

  async write(data: any): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected');
    }
    
    // Your write implementation
    return 'custom-id-' + Date.now();
  }
}

// Register the connector
import { IntegrationHub } from '3ondb';

const hub = new IntegrationHub();
hub.registerConnector(new MyCustomConnector());
```

## API Reference

### QuantumDB Class

#### Constructor

```typescript
constructor(config: DatabaseConfig)
```

**DatabaseConfig Properties:**
- `name: string` - Database name (required)
- `maxMemorySize?: number` - Maximum HOT tier size in bytes (default: 100MB)
- `enableAutoRepair?: boolean` - Enable automatic repairs (default: true)
- `enableSync?: boolean` - Enable synchronization (default: true)
- `syncInterval?: number` - Sync interval in milliseconds (default: 5000)
- `tieringPolicy?: TieringPolicy` - Custom tiering policy

#### Methods

**Initialization**

```typescript
await db.initialize(): Promise<void>
await db.shutdown(): Promise<void>
```

**Data Operations**

```typescript
await db.set(key: string, value: any, tier?: StorageTier): Promise<DataRecord>
await db.get(key: string): Promise<any | null>
await db.delete(key: string): Promise<boolean>
await db.keys(): Promise<string[]>
```

**Query Operations**

```typescript
await db.query(options?: QueryOptions): Promise<DataRecord[]>
```

**QueryOptions Properties:**
- `tier?: StorageTier` - Filter by tier
- `limit?: number` - Maximum results
- `offset?: number` - Skip results
- `sortBy?: string` - Sort field ('key', 'timestamp', 'accessCount', 'size')
- `sortOrder?: 'asc' | 'desc'` - Sort direction

**Health & Maintenance**

```typescript
await db.healthCheck(): Promise<HealthCheck>
await db.optimizeTiers(): Promise<number>
await db.sync(): Promise<SyncResult>
```

**Integration**

```typescript
await db.connectApp(appName: string): Promise<boolean>
await db.queryApp(appName: string, options: QueryOptions): Promise<DataRecord[]>
await db.writeApp(appName: string, data: any): Promise<string>
```

**Statistics & Monitoring**

```typescript
db.getStats(): DatabaseStats
db.getSyncStatus(): SyncStatus
```

**Peer Management**

```typescript
db.addPeer(peerId: string): void
db.removePeer(peerId: string): void
```

### Types & Enums

#### StorageTier

```typescript
enum StorageTier {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold',
  ARCHIVE = 'archive'
}
```

#### HealthStatus

```typescript
enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  CRITICAL = 'critical',
  REPAIRING = 'repairing'
}
```

#### SyncStatus

```typescript
enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  SYNCING = 'syncing',
  FAILED = 'failed'
}
```

## Best Practices

### 1. Choose Appropriate Tiers

```typescript
// Frequently accessed data
await db.set('active-user:123', userData, StorageTier.HOT);

// Historical data
await db.set('log:2023-01', logs, StorageTier.ARCHIVE);
```

### 2. Configure Sync Wisely

```typescript
// High-traffic application
const db = new QuantumDB({
  name: 'high-traffic',
  syncInterval: 1000  // Sync every second
});

// Low-traffic application
const db = new QuantumDB({
  name: 'low-traffic',
  syncInterval: 30000  // Sync every 30 seconds
});
```

### 3. Monitor Health Regularly

```typescript
// Schedule regular health checks
setInterval(async () => {
  const health = await db.healthCheck();
  if (health.status !== HealthStatus.HEALTHY) {
    // Alert or log
    console.warn('Database health issue:', health);
  }
}, 60000); // Every minute
```

### 4. Handle Errors

```typescript
try {
  await db.set('key', value);
} catch (error) {
  console.error('Failed to store data:', error);
  // Implement retry logic
}
```

### 5. Clean Shutdown

```typescript
process.on('SIGTERM', async () => {
  await db.shutdown();
  process.exit(0);
});
```

### 6. Use Appropriate Key Naming

```typescript
// Good key naming conventions
await db.set('user:123', userData);
await db.set('order:456', orderData);
await db.set('session:abc', sessionData);

// Namespace by application
await db.set('3onpay:transaction:789', txData);
await db.set('3onchain:block:1000', blockData);
```

### 7. Optimize Queries

```typescript
// Use pagination for large datasets
const pageSize = 100;
const page1 = await db.query({ limit: pageSize, offset: 0 });
const page2 = await db.query({ limit: pageSize, offset: pageSize });

// Filter by tier for better performance
const hotData = await db.query({ tier: StorageTier.HOT });
```

## Performance Considerations

- **HOT tier** has the fastest access but limited capacity
- **Auto-repair** adds minimal overhead on data access
- **Sync** frequency affects network usage and latency
- **Tier optimization** runs automatically but can be manually triggered

## Troubleshooting

### High Memory Usage

```typescript
// Reduce HOT tier size
const db = new QuantumDB({
  name: 'my-db',
  maxMemorySize: 50 * 1024 * 1024  // 50MB
});

// Force tier optimization
await db.optimizeTiers();
```

### Sync Failures

```typescript
// Check sync status
const status = db.getSyncStatus();
console.log('Queue size:', status.queueSize);
console.log('Peers:', status.peers);

// Force sync
const result = await db.sync();
if (!result.success) {
  console.error('Sync errors:', result.errors);
}
```

### Data Corruption

```typescript
// Check health
const health = await db.healthCheck();

if (health.status === HealthStatus.CRITICAL) {
  // System will auto-repair if enabled
  // Or manually trigger repair
  console.log('Critical issues detected');
}
```
