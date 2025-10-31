/**
 * Storage tier levels for the quantum database
 */
export enum StorageTier {
  HOT = 'hot',       // Frequent access, in-memory
  WARM = 'warm',     // Regular access, SSD
  COLD = 'cold',     // Infrequent access, HDD
  ARCHIVE = 'archive' // Rare access, object storage
}

/**
 * Sync status for data operations
 */
export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  SYNCING = 'syncing',
  FAILED = 'failed'
}

/**
 * Health status for AI-based monitoring
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  CRITICAL = 'critical',
  REPAIRING = 'repairing'
}

/**
 * Data record structure
 */
export interface DataRecord {
  id: string;
  key: string;
  value: any;
  tier: StorageTier;
  metadata: RecordMetadata;
  timestamp: number;
}

/**
 * Metadata for data records
 */
export interface RecordMetadata {
  accessCount: number;
  lastAccessed: number;
  size: number;
  checksum: string;
  syncStatus: SyncStatus;
}

/**
 * Configuration for the database engine
 */
export interface DatabaseConfig {
  name: string;
  maxMemorySize?: number; // Max size for HOT tier in bytes
  enableAutoRepair?: boolean;
  enableSync?: boolean;
  syncInterval?: number; // Sync interval in ms
  tieringPolicy?: TieringPolicy;
}

/**
 * Policy for automatic data tiering
 */
export interface TieringPolicy {
  hotThreshold: number;    // Access count to stay in HOT
  warmThreshold: number;   // Access count to move to WARM
  coldThreshold: number;   // Days since last access to move to COLD
  archiveThreshold: number; // Days since last access to move to ARCHIVE
}

/**
 * Health check result
 */
export interface HealthCheck {
  status: HealthStatus;
  timestamp: number;
  issues: string[];
  repairActions: string[];
}

/**
 * Sync operation result
 */
export interface SyncResult {
  success: boolean;
  recordsSynced: number;
  errors: string[];
  timestamp: number;
}

/**
 * Query options
 */
export interface QueryOptions {
  tier?: StorageTier;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
