/**
 * 3ONDB - Quantum Database Engine
 * 
 * The official quantum database powering the entire 3ON ecosystem
 */

export { QuantumDB } from './QuantumDB';

export {
  StorageTier,
  SyncStatus,
  HealthStatus,
  DataRecord,
  RecordMetadata,
  DatabaseConfig,
  TieringPolicy,
  HealthCheck,
  SyncResult,
  QueryOptions
} from './core/types';

export { StorageTierManager } from './storage/StorageTierManager';
export { AutoRepairSystem } from './ai/AutoRepairSystem';
export { SyncManager } from './sync/SyncManager';
export {
  IntegrationHub,
  AppConnector,
  ThreeONCoreConnector,
  ThreeONChainConnector,
  ThreeONPayConnector
} from './integrations/IntegrationHub';

// Ecosystem exports
export {
  SystemSchema,
  SystemCategory,
  SystemRegistration,
  EcosystemDiscovery,
  ThreeONUPIToken,
  DivineID,
  getAllSystemSchemas,
  getSystemSchema,
  getSchemasByCategory,
  CORE_INFRASTRUCTURE_SCHEMAS,
  BLOCKCHAIN_FINANCIAL_SCHEMAS,
  AI_CONSCIOUS_SCHEMAS,
  IDENTITY_ACCESS_SCHEMAS,
  COMMUNICATION_SOCIAL_SCHEMAS,
  GLOBAL_METAVERSE_SCHEMAS,
  DIVINE_IDS
} from './ecosystem/schemas';

export {
  EcosystemDiscoveryService,
  ConnectionType,
  RegisteredSystem
} from './ecosystem/EcosystemDiscoveryService';

export {
  Universal3ONConnector,
  ConnectorFactory
} from './ecosystem/ConnectorFactory';
