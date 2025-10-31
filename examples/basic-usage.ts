/**
 * Basic usage example for 3ONDB
 */

import { QuantumDB, StorageTier } from '../src';

async function main() {
  console.log('🚀 3ONDB - Quantum Database Engine Example\n');

  // Initialize the database
  const db = new QuantumDB({
    name: 'example-db',
    enableAutoRepair: true,
    enableSync: false, // Disabled for this example
    maxMemorySize: 10 * 1024 * 1024 // 10MB
  });

  await db.initialize();
  console.log('✅ Database initialized\n');

  // Store some data
  console.log('📝 Storing data...');
  await db.set('user:1', { name: 'Alice', email: 'alice@example.com', role: 'admin' });
  await db.set('user:2', { name: 'Bob', email: 'bob@example.com', role: 'user' });
  await db.set('user:3', { name: 'Charlie', email: 'charlie@example.com', role: 'user' });
  
  // Store data in specific tier
  await db.set('archive:old-data', { info: 'rarely accessed' }, StorageTier.ARCHIVE);
  console.log('✅ Data stored\n');

  // Retrieve data
  console.log('📖 Retrieving data...');
  const user1 = await db.get('user:1');
  console.log('User 1:', user1);
  console.log('✅ Data retrieved\n');

  // Get all keys
  console.log('🔑 All keys:');
  const keys = await db.keys();
  console.log(keys);
  console.log('');

  // Query with options
  console.log('🔍 Querying data with options...');
  const records = await db.query({
    limit: 2,
    sortBy: 'key',
    sortOrder: 'asc'
  });
  console.log(`Found ${records.length} records:`);
  records.forEach(r => {
    console.log(`  - ${r.key} (tier: ${r.tier}, accesses: ${r.metadata.accessCount})`);
  });
  console.log('');

  // Get statistics
  console.log('📊 Database Statistics:');
  const stats = db.getStats();
  console.log(`  Total records: ${stats.storage.total.count}`);
  console.log(`  Total size: ${stats.storage.total.size} bytes`);
  console.log(`  HOT tier: ${stats.storage.hot.count} records`);
  console.log(`  WARM tier: ${stats.storage.warm.count} records`);
  console.log(`  COLD tier: ${stats.storage.cold.count} records`);
  console.log(`  ARCHIVE tier: ${stats.storage.archive.count} records`);
  console.log('');

  // Health check
  console.log('🏥 Health Check:');
  const health = await db.healthCheck();
  console.log(`  Status: ${health.status}`);
  console.log(`  Issues: ${health.issues.length}`);
  console.log('');

  // Connect to 3ON apps
  console.log('🔗 Connecting to 3ON apps...');
  await db.connectApp('3ONCORE');
  await db.connectApp('3ONCHAIN');
  await db.connectApp('3ONPAY');
  
  const appStats = db.getStats();
  console.log('  Connected apps:', appStats.integrations.connectors);
  console.log('  Connection status:', appStats.integrations.status);
  console.log('');

  // Delete data
  console.log('🗑️  Deleting data...');
  await db.delete('user:3');
  console.log('✅ User 3 deleted\n');

  // Final statistics
  console.log('📊 Final Statistics:');
  const finalStats = db.getStats();
  console.log(`  Total records: ${finalStats.storage.total.count}`);
  console.log('');

  // Shutdown
  await db.shutdown();
  console.log('✅ Database shutdown complete');
}

// Run the example
main().catch(console.error);
