import { DataRecord, HealthStatus, HealthCheck } from '../core/types';
import * as crypto from 'crypto';

/**
 * AI-based auto-repair system for data integrity
 */
export class AutoRepairSystem {
  private repairHistory: Map<string, Date[]> = new Map();
  private corruptionDetected: Set<string> = new Set();
  
  /**
   * Perform health check on a record
   */
  async checkHealth(record: DataRecord): Promise<HealthCheck> {
    const issues: string[] = [];
    const repairActions: string[] = [];
    let status = HealthStatus.HEALTHY;

    // Verify checksum
    const currentChecksum = this.calculateChecksum(record.value);
    if (currentChecksum !== record.metadata.checksum) {
      issues.push(`Checksum mismatch for record ${record.key}`);
      status = HealthStatus.CRITICAL;
      repairActions.push('Restore from backup or redundant copy');
      this.corruptionDetected.add(record.key);
    }

    // Check metadata consistency
    if (record.metadata.size !== this.calculateSize(record.value)) {
      issues.push(`Size mismatch for record ${record.key}`);
      if (status === HealthStatus.HEALTHY) {
        status = HealthStatus.DEGRADED;
      }
      repairActions.push('Recalculate metadata');
    }

    // Check timestamp validity
    if (record.timestamp > Date.now()) {
      issues.push(`Invalid timestamp for record ${record.key}`);
      if (status === HealthStatus.HEALTHY) {
        status = HealthStatus.DEGRADED;
      }
      repairActions.push('Correct timestamp');
    }

    return {
      status,
      timestamp: Date.now(),
      issues,
      repairActions
    };
  }

  /**
   * Attempt to repair a corrupted record
   */
  async repair(record: DataRecord, backup?: DataRecord): Promise<boolean> {
    const healthCheck = await this.checkHealth(record);
    
    if (healthCheck.status === HealthStatus.HEALTHY) {
      return true;
    }

    // Track repair attempt
    const history = this.repairHistory.get(record.key) || [];
    history.push(new Date());
    this.repairHistory.set(record.key, history);

    // Attempt repairs based on issues
    let repaired = false;

    if (backup) {
      // Use backup for restoration
      record.value = backup.value;
      record.metadata.checksum = this.calculateChecksum(record.value);
      record.metadata.size = this.calculateSize(record.value);
      repaired = true;
    } else {
      // Attempt self-repair
      if (healthCheck.issues.includes(`Size mismatch for record ${record.key}`)) {
        record.metadata.size = this.calculateSize(record.value);
        repaired = true;
      }

      if (healthCheck.issues.includes(`Invalid timestamp for record ${record.key}`)) {
        record.timestamp = Date.now();
        repaired = true;
      }

      // For checksum issues, we need backup data
      if (healthCheck.issues.some(i => i.includes('Checksum mismatch'))) {
        // Mark for manual intervention
        this.corruptionDetected.add(record.key);
      }
    }

    if (repaired) {
      this.corruptionDetected.delete(record.key);
    }

    return repaired;
  }

  /**
   * Perform system-wide health scan
   */
  async scanSystem(records: DataRecord[]): Promise<HealthCheck> {
    const allIssues: string[] = [];
    const allRepairActions: string[] = [];
    let overallStatus = HealthStatus.HEALTHY;

    for (const record of records) {
      const health = await this.checkHealth(record);
      
      if (health.status !== HealthStatus.HEALTHY) {
        allIssues.push(...health.issues);
        allRepairActions.push(...health.repairActions);
        
        if (health.status === HealthStatus.CRITICAL) {
          overallStatus = HealthStatus.CRITICAL;
        } else if (health.status === HealthStatus.DEGRADED && 
                   overallStatus === HealthStatus.HEALTHY) {
          overallStatus = HealthStatus.DEGRADED;
        }
      }
    }

    return {
      status: overallStatus,
      timestamp: Date.now(),
      issues: allIssues,
      repairActions: allRepairActions
    };
  }

  /**
   * Auto-repair all detected issues
   */
  async autoRepairAll(records: DataRecord[]): Promise<number> {
    let repairedCount = 0;

    for (const record of records) {
      const health = await this.checkHealth(record);
      
      if (health.status !== HealthStatus.HEALTHY) {
        const repaired = await this.repair(record);
        if (repaired) {
          repairedCount++;
        }
      }
    }

    return repairedCount;
  }

  /**
   * Get repair statistics
   */
  getRepairStats() {
    const totalRepairs = Array.from(this.repairHistory.values())
      .reduce((sum, history) => sum + history.length, 0);
    
    return {
      totalRepairs,
      corruptedRecords: this.corruptionDetected.size,
      recordsWithHistory: this.repairHistory.size
    };
  }

  /**
   * Predict potential issues using AI-like heuristics
   */
  async predictIssues(records: DataRecord[]): Promise<string[]> {
    const predictions: string[] = [];
    const now = Date.now();

    for (const record of records) {
      // Check for records with frequent repairs
      const history = this.repairHistory.get(record.key);
      if (history && history.length > 3) {
        predictions.push(`Record ${record.key} has frequent repair history`);
      }

      // Check for very old records without access
      const daysSinceAccess = (now - record.metadata.lastAccessed) / (1000 * 60 * 60 * 24);
      if (daysSinceAccess > 365) {
        predictions.push(`Record ${record.key} not accessed in over a year, may be stale`);
      }

      // Check for suspicious access patterns
      if (record.metadata.accessCount > 10000) {
        predictions.push(`Record ${record.key} has unusually high access count`);
      }
    }

    return predictions;
  }

  // Private helper methods

  private calculateChecksum(value: any): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(value));
    return hash.digest('hex');
  }

  private calculateSize(value: any): number {
    return JSON.stringify(value).length;
  }
}
