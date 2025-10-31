import { DataRecord, SyncStatus, SyncResult } from '../core/types';
import { EventEmitter } from 'events';

/**
 * Real-time synchronization manager
 */
export class SyncManager extends EventEmitter {
  private syncQueue: Map<string, DataRecord> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private isEnabled: boolean;
  private peers: Set<string> = new Set();
  private syncHistory: SyncResult[] = [];

  constructor(intervalMs: number = 5000, enabled: boolean = true) {
    super();
    this.intervalMs = intervalMs;
    this.isEnabled = enabled;
  }

  /**
   * Start the sync process
   */
  start(): void {
    if (!this.isEnabled || this.syncInterval) {
      return;
    }

    this.syncInterval = setInterval(async () => {
      await this.performSync();
    }, this.intervalMs);

    this.emit('sync:started');
  }

  /**
   * Stop the sync process
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.emit('sync:stopped');
    }
  }

  /**
   * Add a record to the sync queue
   */
  async queueSync(record: DataRecord): Promise<void> {
    record.metadata.syncStatus = SyncStatus.PENDING;
    this.syncQueue.set(record.key, record);
    this.emit('sync:queued', record.key);
  }

  /**
   * Perform synchronization of queued records
   */
  async performSync(): Promise<SyncResult> {
    if (this.syncQueue.size === 0) {
      return {
        success: true,
        recordsSynced: 0,
        errors: [],
        timestamp: Date.now()
      };
    }

    const errors: string[] = [];
    let syncedCount = 0;

    for (const [key, record] of this.syncQueue.entries()) {
      try {
        record.metadata.syncStatus = SyncStatus.SYNCING;
        
        // Simulate sync to peers
        await this.syncToPeers(record);
        
        record.metadata.syncStatus = SyncStatus.SYNCED;
        this.syncQueue.delete(key);
        syncedCount++;
        
        this.emit('sync:completed', record.key);
      } catch (error) {
        record.metadata.syncStatus = SyncStatus.FAILED;
        const errorMsg = `Failed to sync ${key}: ${error}`;
        errors.push(errorMsg);
        this.emit('sync:error', key, error);
      }
    }

    const result: SyncResult = {
      success: errors.length === 0,
      recordsSynced: syncedCount,
      errors,
      timestamp: Date.now()
    };

    this.syncHistory.push(result);
    this.emit('sync:result', result);

    return result;
  }

  /**
   * Register a peer for synchronization
   */
  addPeer(peerId: string): void {
    this.peers.add(peerId);
    this.emit('peer:added', peerId);
  }

  /**
   * Remove a peer
   */
  removePeer(peerId: string): void {
    this.peers.delete(peerId);
    this.emit('peer:removed', peerId);
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      running: this.syncInterval !== null,
      queueSize: this.syncQueue.size,
      peers: this.peers.size,
      lastSync: this.syncHistory.length > 0 
        ? this.syncHistory[this.syncHistory.length - 1]
        : null
    };
  }

  /**
   * Get sync statistics
   */
  getStats() {
    const totalSynced = this.syncHistory.reduce(
      (sum, result) => sum + result.recordsSynced, 0
    );
    const totalErrors = this.syncHistory.reduce(
      (sum, result) => sum + result.errors.length, 0
    );

    return {
      totalSyncs: this.syncHistory.length,
      totalRecordsSynced: totalSynced,
      totalErrors,
      successRate: this.syncHistory.length > 0
        ? (this.syncHistory.filter(r => r.success).length / this.syncHistory.length) * 100
        : 100
    };
  }

  /**
   * Force immediate sync
   */
  async forceSyncNow(): Promise<SyncResult> {
    return await this.performSync();
  }

  /**
   * Check if a record needs sync
   */
  needsSync(record: DataRecord): boolean {
    return record.metadata.syncStatus !== SyncStatus.SYNCED;
  }

  /**
   * Get records pending sync
   */
  getPendingRecords(): DataRecord[] {
    return Array.from(this.syncQueue.values());
  }

  // Private helper methods

  private async syncToPeers(record: DataRecord): Promise<void> {
    // Simulate peer synchronization
    // In a real implementation, this would send data to peer nodes
    await new Promise(resolve => setTimeout(resolve, 10));
    
    if (this.peers.size === 0) {
      // If no peers, still consider it synced locally
      return;
    }

    // Simulate network delay
    const syncPromises = Array.from(this.peers).map(async (peerId) => {
      // Simulate peer sync
      await new Promise(resolve => setTimeout(resolve, 5));
      this.emit('sync:peer', peerId, record.key);
    });

    await Promise.all(syncPromises);
  }
}
