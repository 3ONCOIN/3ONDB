import { SyncManager } from '../sync/SyncManager';
import { DataRecord, StorageTier, SyncStatus } from '../core/types';
import * as crypto from 'crypto';

describe('SyncManager', () => {
  let syncManager: SyncManager;

  beforeEach(() => {
    syncManager = new SyncManager(100, true); // Fast interval, enabled for testing
  });

  afterEach(() => {
    syncManager.stop();
  });

  function createTestRecord(key: string, value: any): DataRecord {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(value));
    const checksum = hash.digest('hex');

    return {
      id: crypto.randomBytes(16).toString('hex'),
      key,
      value,
      tier: StorageTier.HOT,
      metadata: {
        accessCount: 0,
        lastAccessed: Date.now(),
        size: JSON.stringify(value).length,
        checksum,
        syncStatus: SyncStatus.PENDING
      },
      timestamp: Date.now()
    };
  }

  test('should start and stop sync', () => {
    syncManager.start();
    expect(syncManager.getStatus().running).toBe(true);
    
    syncManager.stop();
    expect(syncManager.getStatus().running).toBe(false);
  });

  test('should queue a record for sync', async () => {
    const record = createTestRecord('key1', 'value1');
    await syncManager.queueSync(record);
    
    const status = syncManager.getStatus();
    expect(status.queueSize).toBe(1);
  });

  test('should perform sync', async () => {
    const record = createTestRecord('key1', 'value1');
    await syncManager.queueSync(record);
    
    const result = await syncManager.performSync();
    
    expect(result.success).toBe(true);
    expect(result.recordsSynced).toBe(1);
  });

  test('should add and remove peers', () => {
    syncManager.addPeer('peer1');
    syncManager.addPeer('peer2');
    
    let status = syncManager.getStatus();
    expect(status.peers).toBe(2);
    
    syncManager.removePeer('peer1');
    status = syncManager.getStatus();
    expect(status.peers).toBe(1);
  });

  test('should get sync statistics', async () => {
    const record = createTestRecord('key1', 'value1');
    await syncManager.queueSync(record);
    await syncManager.performSync();
    
    const stats = syncManager.getStats();
    
    expect(stats.totalSyncs).toBeGreaterThan(0);
    expect(stats.totalRecordsSynced).toBeGreaterThan(0);
  });

  test('should force immediate sync', async () => {
    const record = createTestRecord('key1', 'value1');
    await syncManager.queueSync(record);
    
    const result = await syncManager.forceSyncNow();
    
    expect(result.success).toBe(true);
  });

  test('should check if record needs sync', () => {
    const record = createTestRecord('key1', 'value1');
    expect(syncManager.needsSync(record)).toBe(true);
    
    record.metadata.syncStatus = SyncStatus.SYNCED;
    expect(syncManager.needsSync(record)).toBe(false);
  });

  test('should get pending records', async () => {
    const record1 = createTestRecord('key1', 'value1');
    const record2 = createTestRecord('key2', 'value2');
    
    await syncManager.queueSync(record1);
    await syncManager.queueSync(record2);
    
    const pending = syncManager.getPendingRecords();
    expect(pending).toHaveLength(2);
  });
});
