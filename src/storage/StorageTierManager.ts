import { StorageTier, DataRecord, TieringPolicy } from '../core/types';
import * as crypto from 'crypto';

/**
 * Manages infinite storage tiers with automatic data movement
 */
export class StorageTierManager {
  private hotStorage: Map<string, DataRecord> = new Map();
  private warmStorage: Map<string, DataRecord> = new Map();
  private coldStorage: Map<string, DataRecord> = new Map();
  private archiveStorage: Map<string, DataRecord> = new Map();
  
  private policy: TieringPolicy;
  private maxHotSize: number;

  constructor(policy?: TieringPolicy, maxHotSize: number = 100 * 1024 * 1024) {
    this.policy = policy || {
      hotThreshold: 100,
      warmThreshold: 10,
      coldThreshold: 30,
      archiveThreshold: 90
    };
    this.maxHotSize = maxHotSize;
  }

  /**
   * Store a record in the appropriate tier
   */
  async set(key: string, value: any, tier: StorageTier = StorageTier.HOT): Promise<DataRecord> {
    const record: DataRecord = {
      id: this.generateId(),
      key,
      value,
      tier,
      metadata: {
        accessCount: 0,
        lastAccessed: Date.now(),
        size: this.calculateSize(value),
        checksum: this.calculateChecksum(value),
        syncStatus: 'pending' as any
      },
      timestamp: Date.now()
    };

    await this.storeInTier(record, tier);
    return record;
  }

  /**
   * Get a record by key from any tier
   */
  async get(key: string): Promise<DataRecord | null> {
    // Search through tiers in order of access speed
    const tiers = [
      this.hotStorage,
      this.warmStorage,
      this.coldStorage,
      this.archiveStorage
    ];

    for (const storage of tiers) {
      const record = storage.get(key);
      if (record) {
        // Update access metadata
        record.metadata.accessCount++;
        record.metadata.lastAccessed = Date.now();
        
        // Consider promoting to faster tier
        await this.optimizeTier(record);
        return record;
      }
    }

    return null;
  }

  /**
   * Delete a record from all tiers
   */
  async delete(key: string): Promise<boolean> {
    const deleted = 
      this.hotStorage.delete(key) ||
      this.warmStorage.delete(key) ||
      this.coldStorage.delete(key) ||
      this.archiveStorage.delete(key);
    
    return deleted;
  }

  /**
   * List all records in a specific tier
   */
  async list(tier?: StorageTier): Promise<DataRecord[]> {
    if (tier) {
      const storage = this.getStorageForTier(tier);
      return Array.from(storage.values());
    }
    
    // Return all records from all tiers
    return [
      ...this.hotStorage.values(),
      ...this.warmStorage.values(),
      ...this.coldStorage.values(),
      ...this.archiveStorage.values()
    ];
  }

  /**
   * Optimize data placement based on access patterns
   */
  async optimizeTiers(): Promise<number> {
    let moved = 0;
    const now = Date.now();
    const allRecords = await this.list();

    for (const record of allRecords) {
      const daysSinceAccess = (now - record.metadata.lastAccessed) / (1000 * 60 * 60 * 24);
      let targetTier: StorageTier | null = null;

      // Determine target tier based on policy
      if (record.metadata.accessCount >= this.policy.hotThreshold) {
        targetTier = StorageTier.HOT;
      } else if (record.metadata.accessCount >= this.policy.warmThreshold) {
        targetTier = StorageTier.WARM;
      } else if (daysSinceAccess >= this.policy.archiveThreshold) {
        targetTier = StorageTier.ARCHIVE;
      } else if (daysSinceAccess >= this.policy.coldThreshold) {
        targetTier = StorageTier.COLD;
      }

      // Move if needed
      if (targetTier && targetTier !== record.tier) {
        await this.moveTier(record, targetTier);
        moved++;
      }
    }

    // Ensure HOT tier doesn't exceed size limit
    await this.enforceHotSizeLimit();

    return moved;
  }

  /**
   * Get storage statistics
   */
  getStats() {
    return {
      hot: {
        count: this.hotStorage.size,
        size: this.calculateTierSize(this.hotStorage)
      },
      warm: {
        count: this.warmStorage.size,
        size: this.calculateTierSize(this.warmStorage)
      },
      cold: {
        count: this.coldStorage.size,
        size: this.calculateTierSize(this.coldStorage)
      },
      archive: {
        count: this.archiveStorage.size,
        size: this.calculateTierSize(this.archiveStorage)
      },
      total: {
        count: this.hotStorage.size + this.warmStorage.size + 
               this.coldStorage.size + this.archiveStorage.size,
        size: this.calculateTierSize(this.hotStorage) +
              this.calculateTierSize(this.warmStorage) +
              this.calculateTierSize(this.coldStorage) +
              this.calculateTierSize(this.archiveStorage)
      }
    };
  }

  // Private helper methods

  private async storeInTier(record: DataRecord, tier: StorageTier): Promise<void> {
    const storage = this.getStorageForTier(tier);
    storage.set(record.key, record);
  }

  private getStorageForTier(tier: StorageTier): Map<string, DataRecord> {
    switch (tier) {
      case StorageTier.HOT:
        return this.hotStorage;
      case StorageTier.WARM:
        return this.warmStorage;
      case StorageTier.COLD:
        return this.coldStorage;
      case StorageTier.ARCHIVE:
        return this.archiveStorage;
    }
  }

  private async optimizeTier(record: DataRecord): Promise<void> {
    // Promote frequently accessed data to faster tiers
    if (record.tier !== StorageTier.HOT && 
        record.metadata.accessCount >= this.policy.hotThreshold) {
      await this.moveTier(record, StorageTier.HOT);
    } else if (record.tier === StorageTier.COLD && 
               record.metadata.accessCount >= this.policy.warmThreshold) {
      await this.moveTier(record, StorageTier.WARM);
    }
  }

  private async moveTier(record: DataRecord, targetTier: StorageTier): Promise<void> {
    // Remove from current tier
    const currentStorage = this.getStorageForTier(record.tier);
    currentStorage.delete(record.key);

    // Add to target tier
    record.tier = targetTier;
    const targetStorage = this.getStorageForTier(targetTier);
    targetStorage.set(record.key, record);
  }

  private async enforceHotSizeLimit(): Promise<void> {
    const hotSize = this.calculateTierSize(this.hotStorage);
    if (hotSize <= this.maxHotSize) {
      return;
    }

    // Move least recently accessed items to WARM tier
    const records = Array.from(this.hotStorage.values())
      .sort((a, b) => a.metadata.lastAccessed - b.metadata.lastAccessed);

    let currentSize = hotSize;
    for (const record of records) {
      if (currentSize <= this.maxHotSize * 0.9) {
        break;
      }
      await this.moveTier(record, StorageTier.WARM);
      currentSize -= record.metadata.size;
    }
  }

  private calculateTierSize(storage: Map<string, DataRecord>): number {
    let size = 0;
    for (const record of storage.values()) {
      size += record.metadata.size;
    }
    return size;
  }

  private calculateSize(value: any): number {
    // Rough estimate of object size
    return JSON.stringify(value).length;
  }

  private calculateChecksum(value: any): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(value));
    return hash.digest('hex');
  }

  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
