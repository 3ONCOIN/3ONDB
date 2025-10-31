import { QuantumDB } from './QuantumDB';
import { StorageTier, HealthStatus } from './core/types';

describe('QuantumDB', () => {
  let db: QuantumDB;

  beforeEach(async () => {
    db = new QuantumDB({
      name: 'test-db',
      enableAutoRepair: true,
      enableSync: false, // Disable for tests
      maxMemorySize: 1024 * 1024 // 1MB
    });
    await db.initialize();
  });

  afterEach(async () => {
    await db.shutdown();
  });

  describe('Basic Operations', () => {
    test('should set and get a value', async () => {
      await db.set('user:1', { name: 'Alice', age: 30 });
      const value = await db.get('user:1');
      
      expect(value).toEqual({ name: 'Alice', age: 30 });
    });

    test('should return null for non-existent key', async () => {
      const value = await db.get('non-existent');
      expect(value).toBeNull();
    });

    test('should delete a value', async () => {
      await db.set('temp', 'data');
      const deleted = await db.delete('temp');
      expect(deleted).toBe(true);
      
      const value = await db.get('temp');
      expect(value).toBeNull();
    });

    test('should get all keys', async () => {
      await db.set('key1', 'value1');
      await db.set('key2', 'value2');
      await db.set('key3', 'value3');
      
      const keys = await db.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });
  });

  describe('Storage Tiers', () => {
    test('should store data in specified tier', async () => {
      const record = await db.set('hot-data', 'value', StorageTier.HOT);
      expect(record.tier).toBe(StorageTier.HOT);
    });

    test('should query records by tier', async () => {
      await db.set('hot1', 'value1', StorageTier.HOT);
      await db.set('warm1', 'value2', StorageTier.WARM);
      
      const hotRecords = await db.query({ tier: StorageTier.HOT });
      expect(hotRecords).toHaveLength(1);
      expect(hotRecords[0].key).toBe('hot1');
    });

    test('should optimize tiers', async () => {
      await db.set('data1', 'value1');
      await db.set('data2', 'value2');
      
      const moved = await db.optimizeTiers();
      expect(moved).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await db.set('user:1', { name: 'Alice' });
      await db.set('user:2', { name: 'Bob' });
      await db.set('user:3', { name: 'Charlie' });
    });

    test('should query with limit', async () => {
      const records = await db.query({ limit: 2 });
      expect(records).toHaveLength(2);
    });

    test('should query with offset', async () => {
      const records = await db.query({ offset: 1, limit: 2 });
      expect(records).toHaveLength(2);
    });

    test('should query with sorting', async () => {
      const records = await db.query({ 
        sortBy: 'key', 
        sortOrder: 'asc' 
      });
      expect(records[0].key).toBe('user:1');
    });
  });

  describe('Health Check and Repair', () => {
    test('should perform health check', async () => {
      await db.set('test', 'data');
      const health = await db.healthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('issues');
    });

    test('should detect healthy system', async () => {
      await db.set('test', 'data');
      const health = await db.healthCheck();
      
      expect(health.status).toBe(HealthStatus.HEALTHY);
      expect(health.issues).toHaveLength(0);
    });
  });

  describe('Statistics', () => {
    test('should get database statistics', async () => {
      await db.set('key1', 'value1');
      await db.set('key2', 'value2');
      
      const stats = db.getStats();
      
      expect(stats).toHaveProperty('storage');
      expect(stats).toHaveProperty('sync');
      expect(stats).toHaveProperty('repair');
      expect(stats).toHaveProperty('integrations');
      
      expect(stats.storage.total.count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Integration Hub', () => {
    test('should have default connectors', async () => {
      const stats = db.getStats();
      
      expect(stats.integrations.connectors).toContain('3ONCORE');
      expect(stats.integrations.connectors).toContain('3ONCHAIN');
      expect(stats.integrations.connectors).toContain('3ONPAY');
    });

    test('should connect to app', async () => {
      const connected = await db.connectApp('3ONCORE');
      expect(connected).toBe(true);
      
      const stats = db.getStats();
      expect(stats.integrations.status['3ONCORE']).toBe(true);
    });
  });

  describe('Sync Manager', () => {
    test('should have sync disabled in test config', () => {
      const status = db.getSyncStatus();
      expect(status.enabled).toBe(false);
    });

    test('should add and remove peers', () => {
      db.addPeer('peer1');
      db.addPeer('peer2');
      
      let status = db.getSyncStatus();
      expect(status.peers).toBe(2);
      
      db.removePeer('peer1');
      status = db.getSyncStatus();
      expect(status.peers).toBe(1);
    });
  });
});
