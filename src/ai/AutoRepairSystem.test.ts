import { AutoRepairSystem } from '../ai/AutoRepairSystem';
import { DataRecord, StorageTier, HealthStatus } from '../core/types';
import * as crypto from 'crypto';

describe('AutoRepairSystem', () => {
  let repairSystem: AutoRepairSystem;

  beforeEach(() => {
    repairSystem = new AutoRepairSystem();
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
        syncStatus: 'synced' as any
      },
      timestamp: Date.now()
    };
  }

  test('should detect healthy record', async () => {
    const record = createTestRecord('key1', { data: 'value' });
    const health = await repairSystem.checkHealth(record);
    
    expect(health.status).toBe(HealthStatus.HEALTHY);
    expect(health.issues).toHaveLength(0);
  });

  test('should detect checksum mismatch', async () => {
    const record = createTestRecord('key1', { data: 'value' });
    record.metadata.checksum = 'invalid-checksum';
    
    const health = await repairSystem.checkHealth(record);
    
    expect(health.status).toBe(HealthStatus.CRITICAL);
    expect(health.issues.length).toBeGreaterThan(0);
    expect(health.issues[0]).toContain('Checksum mismatch');
  });

  test('should detect size mismatch', async () => {
    const record = createTestRecord('key1', { data: 'value' });
    record.metadata.size = 9999;
    
    const health = await repairSystem.checkHealth(record);
    
    expect(health.status).toBe(HealthStatus.DEGRADED);
    expect(health.issues.some(i => i.includes('Size mismatch'))).toBe(true);
  });

  test('should repair size mismatch', async () => {
    const record = createTestRecord('key1', { data: 'value' });
    record.metadata.size = 9999;
    
    const repaired = await repairSystem.repair(record);
    
    expect(repaired).toBe(true);
    expect(record.metadata.size).toBe(JSON.stringify(record.value).length);
  });

  test('should scan system health', async () => {
    const records = [
      createTestRecord('key1', { data: 'value1' }),
      createTestRecord('key2', { data: 'value2' })
    ];
    
    const health = await repairSystem.scanSystem(records);
    
    expect(health.status).toBe(HealthStatus.HEALTHY);
    expect(health.timestamp).toBeGreaterThan(0);
  });

  test('should auto-repair multiple records', async () => {
    const record1 = createTestRecord('key1', { data: 'value1' });
    const record2 = createTestRecord('key2', { data: 'value2' });
    
    record1.metadata.size = 9999;
    record2.metadata.size = 8888;
    
    const repairedCount = await repairSystem.autoRepairAll([record1, record2]);
    
    expect(repairedCount).toBe(2);
  });

  test('should get repair statistics', () => {
    const stats = repairSystem.getRepairStats();
    
    expect(stats).toHaveProperty('totalRepairs');
    expect(stats).toHaveProperty('corruptedRecords');
    expect(stats).toHaveProperty('recordsWithHistory');
  });

  test('should predict potential issues', async () => {
    const oldRecord = createTestRecord('old-key', { data: 'old' });
    oldRecord.metadata.lastAccessed = Date.now() - (400 * 24 * 60 * 60 * 1000); // 400 days ago
    
    const predictions = await repairSystem.predictIssues([oldRecord]);
    
    expect(predictions.length).toBeGreaterThan(0);
  });
});
