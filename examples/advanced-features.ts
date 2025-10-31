/**
 * Advanced example demonstrating tiering, sync, and health monitoring
 */

import { QuantumDB, StorageTier, HealthStatus } from '../src';

async function main() {
  console.log('🚀 3ONDB - Advanced Features Example\n');

  // Initialize with custom configuration
  const db = new QuantumDB({
    name: 'advanced-db',
    enableAutoRepair: true,
    enableSync: true,
    syncInterval: 3000,
    maxMemorySize: 5 * 1024 * 1024, // 5MB
    tieringPolicy: {
      hotThreshold: 50,
      warmThreshold: 10,
      coldThreshold: 7,    // Days
      archiveThreshold: 30  // Days
    }
  });

  await db.initialize();
  console.log('✅ Database initialized with custom config\n');

  // Add sync peers
  console.log('👥 Adding sync peers...');
  db.addPeer('peer-node-1');
  db.addPeer('peer-node-2');
  db.addPeer('peer-node-3');
  
  const syncStatus = db.getSyncStatus();
  console.log(`  Peers: ${syncStatus.peers}`);
  console.log(`  Sync enabled: ${syncStatus.enabled}`);
  console.log('');

  // Store data across different tiers
  console.log('📝 Storing data across tiers...');
  
  // HOT tier - frequently accessed
  for (let i = 1; i <= 5; i++) {
    await db.set(`hot:user:${i}`, {
      name: `User ${i}`,
      active: true
    }, StorageTier.HOT);
  }
  
  // WARM tier - regularly accessed
  for (let i = 1; i <= 3; i++) {
    await db.set(`warm:session:${i}`, {
      sessionId: `session-${i}`,
      lastActivity: Date.now()
    }, StorageTier.WARM);
  }
  
  // COLD tier - infrequently accessed
  await db.set('cold:config', {
    version: '1.0',
    settings: { theme: 'dark' }
  }, StorageTier.COLD);
  
  // ARCHIVE tier - rarely accessed
  await db.set('archive:logs:2023', {
    year: 2023,
    entries: []
  }, StorageTier.ARCHIVE);
  
  console.log('✅ Data stored across all tiers\n');

  // Check tier distribution
  console.log('📊 Storage Tier Distribution:');
  const stats = db.getStats();
  console.log(`  HOT: ${stats.storage.hot.count} records (${stats.storage.hot.size} bytes)`);
  console.log(`  WARM: ${stats.storage.warm.count} records (${stats.storage.warm.size} bytes)`);
  console.log(`  COLD: ${stats.storage.cold.count} records (${stats.storage.cold.size} bytes)`);
  console.log(`  ARCHIVE: ${stats.storage.archive.count} records (${stats.storage.archive.size} bytes)`);
  console.log('');

  // Simulate frequent access to promote data to HOT tier
  console.log('🔥 Simulating frequent access...');
  for (let i = 0; i < 60; i++) {
    await db.get('warm:session:1');
  }
  console.log('✅ Accessed warm:session:1 60 times\n');

  // Optimize tiers
  console.log('⚡ Optimizing storage tiers...');
  const movedCount = await db.optimizeTiers();
  console.log(`  Moved ${movedCount} records between tiers\n`);

  // Check updated distribution
  console.log('📊 Updated Storage Tier Distribution:');
  const updatedStats = db.getStats();
  console.log(`  HOT: ${updatedStats.storage.hot.count} records`);
  console.log(`  WARM: ${updatedStats.storage.warm.count} records`);
  console.log(`  COLD: ${updatedStats.storage.cold.count} records`);
  console.log(`  ARCHIVE: ${updatedStats.storage.archive.count} records`);
  console.log('');

  // Perform health check
  console.log('🏥 Performing health check...');
  const health = await db.healthCheck();
  console.log(`  Status: ${health.status}`);
  console.log(`  Timestamp: ${new Date(health.timestamp).toISOString()}`);
  console.log(`  Issues found: ${health.issues.length}`);
  
  if (health.status === HealthStatus.HEALTHY) {
    console.log('  ✅ All systems healthy!');
  } else {
    console.log('  ⚠️  Issues detected:', health.issues);
    console.log('  Repair actions:', health.repairActions);
  }
  console.log('');

  // Force sync
  console.log('🔄 Forcing immediate sync...');
  const syncResult = await db.sync();
  console.log(`  Success: ${syncResult.success}`);
  console.log(`  Records synced: ${syncResult.recordsSynced}`);
  console.log(`  Errors: ${syncResult.errors.length}`);
  console.log('');

  // Get sync statistics
  console.log('📊 Sync Statistics:');
  const finalStats = db.getStats();
  console.log(`  Total syncs: ${finalStats.sync.totalSyncs}`);
  console.log(`  Total records synced: ${finalStats.sync.totalRecordsSynced}`);
  console.log(`  Success rate: ${finalStats.sync.successRate.toFixed(2)}%`);
  console.log('');

  // Query specific tier
  console.log('🔍 Querying HOT tier...');
  const hotRecords = await db.query({
    tier: StorageTier.HOT,
    sortBy: 'accessCount',
    sortOrder: 'desc'
  });
  console.log(`  Found ${hotRecords.length} records in HOT tier`);
  hotRecords.forEach(r => {
    console.log(`    - ${r.key}: ${r.metadata.accessCount} accesses`);
  });
  console.log('');

  // Connect to 3ON apps
  console.log('🔗 Connecting to 3ON ecosystem...');
  await db.connectApp('3ONCORE');
  await db.connectApp('3ONCHAIN');
  await db.connectApp('3ONPAY');
  
  const integrationStats = db.getStats();
  console.log('  Connected apps:');
  integrationStats.integrations.connectors.forEach(app => {
    const status = integrationStats.integrations.status[app] ? '✅' : '❌';
    console.log(`    ${status} ${app}`);
  });
  console.log('');

  // Write to 3ON apps
  console.log('📤 Writing to 3ON apps...');
  const coreId = await db.writeApp('3ONCORE', { type: 'test', data: 'example' });
  const chainId = await db.writeApp('3ONCHAIN', { tx: 'test-transaction' });
  const payId = await db.writeApp('3ONPAY', { amount: 100, currency: 'USD' });
  
  console.log(`  3ONCORE: ${coreId}`);
  console.log(`  3ONCHAIN: ${chainId}`);
  console.log(`  3ONPAY: ${payId}`);
  console.log('');

  // Final statistics
  console.log('📊 Final Database Statistics:');
  const finalDbStats = db.getStats();
  console.log('  Storage:');
  console.log(`    Total: ${finalDbStats.storage.total.count} records`);
  console.log(`    Size: ${finalDbStats.storage.total.size} bytes`);
  console.log('  Repair:');
  console.log(`    Total repairs: ${finalDbStats.repair.totalRepairs}`);
  console.log(`    Corrupted records: ${finalDbStats.repair.corruptedRecords}`);
  console.log('  Sync:');
  console.log(`    Total syncs: ${finalDbStats.sync.totalSyncs}`);
  console.log(`    Success rate: ${finalDbStats.sync.successRate.toFixed(2)}%`);
  console.log('');

  // Cleanup
  await db.shutdown();
  console.log('✅ Database shutdown complete');
}

// Run the example
main().catch(console.error);
