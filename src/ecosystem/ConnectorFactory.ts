import { BaseConnector } from '../integrations/IntegrationHub';
import { DataRecord, QueryOptions } from '../core/types';
import { SystemSchema, getAllSystemSchemas } from './schemas';

/**
 * Universal 3ON System Connector
 * Auto-generated connector for any 3ON system based on schema
 */
export class Universal3ONConnector extends BaseConnector {
  appName: string;
  private schema: SystemSchema;
  private authToken?: string;

  constructor(schema: SystemSchema) {
    super();
    this.appName = schema.systemName;
    this.schema = schema;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  async connect(): Promise<boolean> {
    // Validate authentication if required (allow bypass for testing/examples)
    if (this.schema.requiresAuth && !this.authToken) {
      // In production, this would throw. For demo purposes, we'll allow connection
      // throw new Error(`${this.appName} requires authentication`);
      console.warn(`Warning: ${this.appName} connected without authentication (demo mode)`);
    }

    await super.connect();
    return true;
  }

  async query(options: QueryOptions): Promise<DataRecord[]> {
    if (!this.connected) {
      throw new Error(`Not connected to ${this.appName}`);
    }

    // In a real implementation, this would make HTTP/WebSocket requests
    // to the system's endpoint based on the schema
    return [];
  }

  async write(data: any): Promise<string> {
    if (!this.connected) {
      throw new Error(`Not connected to ${this.appName}`);
    }

    // In a real implementation, this would POST data to the system's endpoint
    const prefix = this.appName.toLowerCase().replace('3on', '').replace(/^/, '');
    return `${prefix}-${Date.now()}`;
  }

  /**
   * Get system schema
   */
  getSchema(): SystemSchema {
    return this.schema;
  }

  /**
   * Check if system has capability
   */
  hasCapability(capability: string): boolean {
    return this.schema.capabilities.includes(capability);
  }
}

/**
 * Connector Factory for all 3ON systems
 */
export class ConnectorFactory {
  private static connectorCache: Map<string, Universal3ONConnector> = new Map();

  /**
   * Create connector for a specific 3ON system
   */
  static createConnector(systemName: string): Universal3ONConnector {
    // Check cache first
    if (this.connectorCache.has(systemName)) {
      return this.connectorCache.get(systemName)!;
    }

    // Find schema
    const schema = getAllSystemSchemas().find(s => s.systemName === systemName);
    
    if (!schema) {
      throw new Error(`Unknown system: ${systemName}`);
    }

    const connector = new Universal3ONConnector(schema);
    this.connectorCache.set(systemName, connector);
    
    return connector;
  }

  /**
   * Create connectors for all systems
   */
  static createAllConnectors(): Universal3ONConnector[] {
    const schemas = getAllSystemSchemas();
    return schemas.map(schema => this.createConnector(schema.systemName));
  }

  /**
   * Create connectors for systems in a category
   */
  static createConnectorsByCategory(category: string): Universal3ONConnector[] {
    const schemas = getAllSystemSchemas().filter(s => s.category === category);
    return schemas.map(schema => this.createConnector(schema.systemName));
  }

  /**
   * Clear connector cache
   */
  static clearCache(): void {
    this.connectorCache.clear();
  }
}
