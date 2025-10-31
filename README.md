# 3ONDB - Quantum Database Engine

The official quantum database powering the 3ON ecosystem with infinite storage tiers, AI-based auto-repair, real-time sync, and universal data connectivity.

## Features

### 🚀 Infinite Storage Tiers
- **HOT**: Frequent access, in-memory storage
- **WARM**: Regular access, SSD-equivalent storage
- **COLD**: Infrequent access, HDD-equivalent storage
- **ARCHIVE**: Rare access, object storage
- Automatic tier optimization based on access patterns

### 🤖 AI-Based Auto-Repair
- Automatic data integrity checking
- Self-healing capabilities with checksum verification
- Predictive issue detection
- Automatic repair of corrupted records

### ⚡ Real-Time Sync
- Multi-peer synchronization
- Configurable sync intervals
- Queue-based sync management
- Event-driven architecture

### 🔗 Universal Data Connectivity
- Built-in connectors for 3ON ecosystem:
  - **3ONCORE**: Core application data
  - **3ONCHAIN**: Blockchain integration
  - **3ONPAY**: Payment system integration
- Extensible connector architecture

## Installation

```bash
npm install 3ondb
```

## Quick Start

```typescript
import { QuantumDB, StorageTier } from '3ondb';

// Initialize the database
const db = new QuantumDB({
  name: 'my-quantum-db',
  enableAutoRepair: true,
  enableSync: true,
  syncInterval: 5000,
  maxMemorySize: 100 * 1024 * 1024 // 100MB for HOT tier
});

await db.initialize();

// Store data
await db.set('user:1', { name: 'Alice', age: 30 });

// Retrieve data
const user = await db.get('user:1');
console.log(user); // { name: 'Alice', age: 30 }

// Store in specific tier
await db.set('archive-data', { info: 'rarely accessed' }, StorageTier.ARCHIVE);

// Query with options
const records = await db.query({
  tier: StorageTier.HOT,
  limit: 10,
  sortBy: 'timestamp',
  sortOrder: 'desc'
});

// Delete data
await db.delete('user:1');

// Shutdown
await db.shutdown();
```

For complete documentation, see [DOCUMENTATION.md](DOCUMENTATION.md).

## License

MIT
