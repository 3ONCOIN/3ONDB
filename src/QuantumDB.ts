import { 
  DatabaseConfig, 
  DataRecord, 
  StorageTier, 
  QueryOptions, 
  HealthCheck,
  SyncResult 
} from './core/types';
import { StorageTierManager } from './storage/StorageTierManager';
import { AutoRepairSystem } from './ai/AutoRepairSystem';
import { SyncManager } from './sync/SyncManager';
import { 
  IntegrationHub, 
  ThreeONCoreConnector, 
  ThreeONChainConnector, 
  ThreeONPayConnector 
} from './integrations/IntegrationHub';

/**
 * 3ONDB - Quantum Database Engine
 * 
 * Features:
 * - Infinite storage tiers (HOT, WARM, COLD, ARCHIVE)
 * - AI-based auto-repair
 * - Real-time synchronization
 * - Universal data connectivity for 3ON ecosystem
 */
export class QuantumDB {
  private config: DatabaseConfig;
  private storageManager: StorageTierManager;
  private repairSystem: AutoRepairSystem;
  private syncManager: SyncManager;
  private integrationHub: IntegrationHub;
  private initialized: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = {
      enableAutoRepair: true,
      enableSync: true,
      syncInterval: 5000,
      ...config
    };

    // Initialize components
    this.storageManager = new StorageTierManager(
      config.tieringPolicy,
      config.maxMemorySize
    );
    this.repairSystem = new AutoRepairSystem();
    this.syncManager = new SyncManager(
      this.config.syncInterval,
      this.config.enableSync
    );
    this.integrationHub = new IntegrationHub();

    // Register default 3ON app connectors
    this.integrationHub.registerConnector(new ThreeONCoreConnector());
    this.integrationHub.registerConnector(new ThreeONChainConnector());
    this.integrationHub.registerConnector(new ThreeONPayConnector());
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Start sync manager if enabled
    if (this.config.enableSync) {
      this.syncManager.start();
    }

    // Set up auto-repair if enabled
    if (this.config.enableAutoRepair) {
      this.setupAutoRepair();
    }

    // Set up automatic tier optimization
    this.setupTierOptimization();

    this.initialized = true;
  }

  /**
   * Shutdown the database
   */
  async shutdown(): Promise<void> {
    this.syncManager.stop();
    this.initialized = false;
  }

  /**
   * Set a value in the database
   */
  async set(key: string, value: any, tier?: StorageTier): Promise<DataRecord> {
    const record = await this.storageManager.set(key, value, tier);
    
    // Queue for sync
    if (this.config.enableSync) {
      await this.syncManager.queueSync(record);
    }

    return record;
  }

  /**
   * Get a value from the database
   */
  async get(key: string): Promise<any | null> {
    const record = await this.storageManager.get(key);
    
    if (record && this.config.enableAutoRepair) {
      // Auto-check health on access
      const health = await this.repairSystem.checkHealth(record);
      if (health.status !== 'healthy') {
        await this.repairSystem.repair(record);
      }
    }

    return record ? record.value : null;
  }

  /**
   * Delete a value from the database
   */
  async delete(key: string): Promise<boolean> {
    return await this.storageManager.delete(key);
  }

  /**
   * Query records with options
   */
  async query(options: QueryOptions = {}): Promise<DataRecord[]> {
    let records = await this.storageManager.list(options.tier);

    // Apply sorting
    if (options.sortBy) {
      records = this.sortRecords(records, options.sortBy, options.sortOrder);
    }

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || records.length;
    records = records.slice(offset, offset + limit);

    return records;
  }

  /**
   * Get all keys
   */
  async keys(): Promise<string[]> {
    const records = await this.storageManager.list();
    return records.map(r => r.key);
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<HealthCheck> {
    const records = await this.storageManager.list();
    return await this.repairSystem.scanSystem(records);
  }

  /**
   * Force sync now
   */
  async sync(): Promise<SyncResult> {
    return await this.syncManager.forceSyncNow();
  }

  /**
   * Optimize storage tiers
   */
  async optimizeTiers(): Promise<number> {
    return await this.storageManager.optimizeTiers();
  }

  /**
   * Connect to a 3ON app
   */
  async connectApp(appName: string): Promise<boolean> {
    return await this.integrationHub.connect(appName);
  }

  /**
   * Query data from a 3ON app
   */
  async queryApp(appName: string, options: QueryOptions): Promise<DataRecord[]> {
    return await this.integrationHub.query(appName, options);
  }

  /**
   * Write data to a 3ON app
   */
  async writeApp(appName: string, data: any): Promise<string> {
    return await this.integrationHub.write(appName, data);
  }

  /**
   * Get database statistics
   */
  getStats() {
    return {
      storage: this.storageManager.getStats(),
      sync: this.syncManager.getStats(),
      repair: this.repairSystem.getRepairStats(),
      integrations: {
        connectors: this.integrationHub.getConnectors(),
        status: Object.fromEntries(this.integrationHub.getConnectionStatus())
      }
    };
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return this.syncManager.getStatus();
  }

  /**
   * Add sync peer
   */
  addPeer(peerId: string): void {
    this.syncManager.addPeer(peerId);
  }

  /**
   * Remove sync peer
   */
  removePeer(peerId: string): void {
    this.syncManager.removePeer(peerId);
  }

  // Private helper methods

  private setupAutoRepair(): void {
    // Periodic health checks and auto-repair
    setInterval(async () => {
      const records = await this.storageManager.list();
      await this.repairSystem.autoRepairAll(records);
    }, 60000); // Every minute
  }

  private setupTierOptimization(): void {
    // Periodic tier optimization
    setInterval(async () => {
      await this.storageManager.optimizeTiers();
    }, 300000); // Every 5 minutes
  }

  private sortRecords(
    records: DataRecord[], 
    sortBy: string, 
    order: 'asc' | 'desc' = 'asc'
  ): DataRecord[] {
    return records.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'key':
          aVal = a.key;
          bVal = b.key;
          break;
        case 'timestamp':
          aVal = a.timestamp;
          bVal = b.timestamp;
          break;
        case 'accessCount':
          aVal = a.metadata.accessCount;
          bVal = b.metadata.accessCount;
          break;
        case 'size':
          aVal = a.metadata.size;
          bVal = b.metadata.size;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }
}
