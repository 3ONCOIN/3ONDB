import { StorageTierManager } from '../storage/StorageTierManager';
import { StorageTier } from '../core/types';

describe('StorageTierManager', () => {
  let manager: StorageTierManager;

  beforeEach(() => {
    manager = new StorageTierManager();
  });

  test('should set and get a record', async () => {
    await manager.set('key1', 'value1');
    const record = await manager.get('key1');
    
    expect(record).not.toBeNull();
    expect(record?.value).toBe('value1');
  });

  test('should store record in specified tier', async () => {
    const record = await manager.set('key1', 'value1', StorageTier.WARM);
    expect(record.tier).toBe(StorageTier.WARM);
  });

  test('should delete a record', async () => {
    await manager.set('key1', 'value1');
    const deleted = await manager.delete('key1');
    expect(deleted).toBe(true);
    
    const record = await manager.get('key1');
    expect(record).toBeNull();
  });

  test('should update access count on get', async () => {
    await manager.set('key1', 'value1');
    
    const record1 = await manager.get('key1');
    expect(record1?.metadata.accessCount).toBe(1);
    
    const record2 = await manager.get('key1');
    expect(record2?.metadata.accessCount).toBe(2);
  });

  test('should list all records', async () => {
    await manager.set('key1', 'value1');
    await manager.set('key2', 'value2');
    
    const records = await manager.list();
    expect(records).toHaveLength(2);
  });

  test('should list records by tier', async () => {
    await manager.set('hot1', 'value1', StorageTier.HOT);
    await manager.set('warm1', 'value2', StorageTier.WARM);
    
    const hotRecords = await manager.list(StorageTier.HOT);
    expect(hotRecords).toHaveLength(1);
    expect(hotRecords[0].key).toBe('hot1');
  });

  test('should get storage statistics', async () => {
    await manager.set('key1', 'value1', StorageTier.HOT);
    await manager.set('key2', 'value2', StorageTier.WARM);
    
    const stats = manager.getStats();
    
    expect(stats.hot.count).toBe(1);
    expect(stats.warm.count).toBe(1);
    expect(stats.total.count).toBe(2);
  });

  test('should optimize tiers', async () => {
    await manager.set('key1', 'value1');
    await manager.set('key2', 'value2');
    
    const moved = await manager.optimizeTiers();
    expect(moved).toBeGreaterThanOrEqual(0);
  });
});
