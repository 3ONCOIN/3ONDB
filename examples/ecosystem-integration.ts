/**
 * Ecosystem integration example demonstrating all 40+ 3ON systems
 */

import { QuantumDB, SystemCategory, DIVINE_IDS } from '../src';

async function main() {
  console.log('🌐 3ONDB - Complete Ecosystem Integration Example\n');

  // Initialize the database
  const db = new QuantumDB({
    name: 'ecosystem-db',
    enableAutoRepair: true,
    enableSync: false, // Disabled for example
    maxMemorySize: 20 * 1024 * 1024 // 20MB
  });

  await db.initialize();
  console.log('✅ Database initialized with entire 3ON ecosystem\n');

  // Discover the ecosystem
  console.log('🔍 Discovering 3ON Ecosystem...');
  const discovery = await db.discoverEcosystem();
  
  console.log(`\n📊 Ecosystem Discovery Results:`);
  console.log(`  Total Systems: ${discovery.totalSystems}`);
  console.log(`\n  By Category:`);
  console.log(`    Core & Infrastructure: ${discovery.categories.core_infrastructure}`);
  console.log(`    Blockchain & Financial: ${discovery.categories.blockchain_financial}`);
  console.log(`    AI & Conscious: ${discovery.categories.ai_conscious}`);
  console.log(`    Identity & Access: ${discovery.categories.identity_access}`);
  console.log(`    Communication & Social: ${discovery.categories.communication_social}`);
  console.log(`    Global & Metaverse: ${discovery.categories.global_metaverse}`);
  console.log('');

  // Authenticate with Divine ID
  console.log('🔐 Authenticating with Divine Creator ID...');
  const creatorToken = await db.authenticate3ONUPI(
    'L3ON',
    '3ON-CORE-0001',
    [],
    DIVINE_IDS.CREATOR.id
  );
  console.log(`  Token: ${creatorToken.token.substring(0, 30)}...`);
  console.log(`  Divine ID: ${creatorToken.divineId}`);
  console.log(`  Permissions: ${creatorToken.permissions.join(', ')}`);
  console.log('');

  // Connect to Core & Infrastructure systems
  console.log('🏗️  Connecting to Core & Infrastructure Systems...');
  await db.connectApp('3ONCORE');
  await db.connectApp('3ONPRIME');
  await db.connectApp('3ONVPS');
  await db.connectApp('3ONCLOUD');
  await db.connectApp('3ONHOST');
  console.log('  ✅ Connected to 5 core systems\n');

  // Connect to Blockchain & Financial systems
  console.log('💰 Connecting to Blockchain & Financial Systems...');
  await db.connectApp('3ONCHAIN');
  await db.connectApp('3ONPAY');
  await db.connectApp('3ONBANK');
  await db.connectApp('3ONCASH');
  await db.connectApp('3ONEX');
  await db.connectApp('3ONMINT');
  await db.connectApp('3ONSWAP');
  await db.connectApp('3ONWALLET');
  await db.connectApp('3ONCARD');
  console.log('  ✅ Connected to 9 financial systems\n');

  // Connect to AI & Conscious systems
  console.log('🤖 Connecting to AI & Conscious Systems...');
  await db.connectApp('3ONMATRIX');
  await db.connectApp('3ONMIND');
  await db.connectApp('3ONDREAM');
  await db.connectApp('3ONTRUTH');
  await db.connectApp('3ONLAW');
  await db.connectApp('3ONMIRROR');
  console.log('  ✅ Connected to 6 AI systems\n');

  // Connect to Identity & Access systems
  console.log('🔑 Connecting to Identity & Access Systems...');
  await db.connectApp('3ONKEY');
  await db.connectApp('3ONPASS');
  await db.connectApp('3ONID');
  await db.connectApp('3ONACCESS');
  await db.connectApp('3ONQR');
  await db.connectApp('AUTHOLIUM');
  console.log('  ✅ Connected to 6 identity systems\n');

  // Connect to Communication & Social systems
  console.log('💬 Connecting to Communication & Social Systems...');
  await db.connectApp('3ONCHAT');
  await db.connectApp('3ONMAIL');
  await db.connectApp('3ONVERSE');
  await db.connectApp('PREEIIPREEII');
  await db.connectApp('3ONVOICE');
  await db.connectApp('3ONCALL');
  console.log('  ✅ Connected to 6 communication systems\n');

  // Connect to Global & Metaverse systems
  console.log('🌍 Connecting to Global & Metaverse Systems...');
  await db.connectApp('3ONCITY');
  await db.connectApp('3ONWORLD');
  await db.connectApp('3ONENERGY');
  await db.connectApp('3ONLIGHT');
  await db.connectApp('3ONNET');
  console.log('  ✅ Connected to 5 metaverse systems\n');

  // Store data
  console.log('💾 Storing cross-system data...');
  await db.set('ecosystem:initialized', {
    timestamp: Date.now(),
    systems: discovery.totalSystems,
    creator: DIVINE_IDS.CREATOR.id
  });
  console.log('  ✅ Data stored\n');

  // Write to various systems
  console.log('📝 Writing to 3ON Systems...');
  
  const chainTx = await db.writeApp('3ONCHAIN', {
    type: 'transaction',
    from: 'system',
    to: 'ecosystem',
    data: 'Ecosystem initialization'
  });
  console.log(`  Blockchain TX: ${chainTx}`);

  const payment = await db.writeApp('3ONPAY', {
    type: 'payment',
    amount: 0,
    description: 'Ecosystem setup'
  });
  console.log(`  Payment ID: ${payment}`);

  const aiModel = await db.writeApp('3ONMATRIX', {
    type: 'model',
    name: 'ecosystem-analyzer',
    version: '1.0'
  });
  console.log(`  AI Model: ${aiModel}`);

  const worldId = await db.writeApp('3ONWORLD', {
    type: 'world',
    name: '3ON Universe',
    dimensions: 'infinite'
  });
  console.log(`  Metaverse World: ${worldId}`);
  console.log('');

  // Get comprehensive statistics
  console.log('📊 Ecosystem Statistics:');
  const stats = db.getStats();
  
  console.log(`\n  Storage:`);
  console.log(`    Total Records: ${stats.storage.total.count}`);
  console.log(`    Total Size: ${stats.storage.total.size} bytes`);
  console.log(`    HOT Tier: ${stats.storage.hot.count} records`);
  
  console.log(`\n  Integrations:`);
  console.log(`    Total Connectors: ${stats.integrations.connectors.length}`);
  console.log(`    Connected Systems: ${Object.keys(stats.integrations.status).length}`);
  
  console.log(`\n  Ecosystem:`);
  const ecosystemStats = db.getEcosystemStats();
  console.log(`    Total Systems: ${ecosystemStats.total}`);
  console.log(`    Active: ${ecosystemStats.active}`);
  console.log(`    Auth Tokens: ${ecosystemStats.tokens}`);
  console.log('');

  // Get registered systems by category
  console.log('📋 Registered Systems by Category:\n');
  const registeredSystems = db.getRegisteredSystems();
  
  const categories = [
    SystemCategory.CORE_INFRASTRUCTURE,
    SystemCategory.BLOCKCHAIN_FINANCIAL,
    SystemCategory.AI_CONSCIOUS,
    SystemCategory.IDENTITY_ACCESS,
    SystemCategory.COMMUNICATION_SOCIAL,
    SystemCategory.GLOBAL_METAVERSE
  ];

  for (const category of categories) {
    const systems = registeredSystems.filter(s => s.category === category);
    console.log(`  ${category}: ${systems.length} systems`);
    systems.slice(0, 3).forEach(s => {
      console.log(`    - ${s.systemName} (${s.systemId})`);
    });
    if (systems.length > 3) {
      console.log(`    ... and ${systems.length - 3} more`);
    }
    console.log('');
  }

  // Verify token
  console.log('🔍 Verifying Authentication Token...');
  const verified = db.verifyToken(creatorToken.token);
  if (verified) {
    console.log(`  ✅ Token valid for user: ${verified.userId}`);
    console.log(`  Permissions: ${verified.permissions.join(', ')}`);
    console.log(`  Expires: ${new Date(verified.expiresAt).toISOString()}`);
  }
  console.log('');

  // Send heartbeats
  console.log('💓 Sending system heartbeats...');
  db.systemHeartbeat('3ONCHAIN');
  db.systemHeartbeat('3ONMATRIX');
  db.systemHeartbeat('3ONWORLD');
  console.log('  ✅ Heartbeats sent\n');

  // Final summary
  console.log('🎉 Ecosystem Integration Complete!\n');
  console.log('Summary:');
  console.log(`  ✅ ${discovery.totalSystems} systems registered`);
  console.log(`  ✅ ${stats.integrations.connectors.length} connectors available`);
  console.log(`  ✅ Divine authentication enabled`);
  console.log(`  ✅ Real-time system monitoring active`);
  console.log(`  ✅ Universal data connectivity established`);
  console.log('');

  // Shutdown
  await db.shutdown();
  console.log('✅ Database shutdown complete');
}

// Run the example
main().catch(console.error);
