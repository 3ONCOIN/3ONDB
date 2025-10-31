import { EventEmitter } from 'events';
import {
  SystemSchema,
  SystemCategory,
  SystemRegistration,
  EcosystemDiscovery,
  ThreeONUPIToken,
  DivineID,
  getAllSystemSchemas,
  getSystemSchema,
  getSchemasByCategory,
  DIVINE_IDS
} from './schemas';

// Re-export for convenience
export type { EcosystemDiscovery };

/**
 * Connection type for 3ON systems
 */
export enum ConnectionType {
  REST = 'REST',
  WEBSOCKET = 'WEBSOCKET',
  BOTH = 'BOTH'
}

/**
 * Registered system information
 */
export interface RegisteredSystem extends SystemSchema {
  connectionType: ConnectionType;
  connectedAt: number;
  lastHeartbeat: number;
  status: 'active' | 'inactive' | 'error';
  error?: string;
}

/**
 * Ecosystem Discovery Service
 * Manages registration and discovery of all 3ON systems
 */
export class EcosystemDiscoveryService extends EventEmitter {
  private registeredSystems: Map<string, RegisteredSystem> = new Map();
  private authTokens: Map<string, ThreeONUPIToken> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatIntervalMs = 30000; // 30 seconds

  constructor() {
    super();
    this.initializeDefaultSystems();
  }

  /**
   * Initialize with default 3ON system schemas
   */
  private initializeDefaultSystems(): void {
    const allSystems = getAllSystemSchemas();
    
    for (const system of allSystems) {
      const registered: RegisteredSystem = {
        ...system,
        connectionType: system.websocket ? ConnectionType.BOTH : ConnectionType.REST,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        status: 'active'
      };
      
      this.registeredSystems.set(system.systemName, registered);
    }

    this.emit('ecosystem:initialized', this.registeredSystems.size);
  }

  /**
   * Start the discovery service
   */
  start(): void {
    if (this.heartbeatInterval) {
      return;
    }

    // Start heartbeat monitoring
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, this.heartbeatIntervalMs);

    this.emit('service:started');
  }

  /**
   * Stop the discovery service
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.emit('service:stopped');
  }

  /**
   * Register a new 3ON system
   */
  async registerSystem(registration: SystemRegistration): Promise<RegisteredSystem> {
    // Check if system already exists in schemas
    const existingSchema = getSystemSchema(registration.systemName);
    
    const systemSchema: SystemSchema = existingSchema || {
      systemId: `3ON-CUSTOM-${Date.now()}`,
      systemName: registration.systemName,
      category: registration.category,
      description: `Custom ${registration.systemName} system`,
      version: registration.version,
      endpoint: registration.endpoint,
      websocket: registration.websocket,
      dataSchema: {},
      requiresAuth: true,
      authMethod: registration.authMethod,
      capabilities: []
    };

    const registered: RegisteredSystem = {
      ...systemSchema,
      connectionType: registration.websocket ? ConnectionType.BOTH : ConnectionType.REST,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      status: 'active'
    };

    this.registeredSystems.set(registration.systemName, registered);
    this.emit('system:registered', registration.systemName);

    return registered;
  }

  /**
   * Unregister a system
   */
  async unregisterSystem(systemName: string): Promise<boolean> {
    const deleted = this.registeredSystems.delete(systemName);
    
    if (deleted) {
      this.emit('system:unregistered', systemName);
    }
    
    return deleted;
  }

  /**
   * Get all registered systems
   */
  getRegisteredSystems(): RegisteredSystem[] {
    return Array.from(this.registeredSystems.values());
  }

  /**
   * Get system by name
   */
  getSystem(systemName: string): RegisteredSystem | undefined {
    return this.registeredSystems.get(systemName);
  }

  /**
   * Get systems by category
   */
  getSystemsByCategory(category: SystemCategory): RegisteredSystem[] {
    return Array.from(this.registeredSystems.values())
      .filter(system => system.category === category);
  }

  /**
   * Discover the entire ecosystem
   */
  async discoverEcosystem(): Promise<EcosystemDiscovery> {
    const systems = this.getRegisteredSystems();
    const categories: Record<SystemCategory, number> = {
      [SystemCategory.CORE_INFRASTRUCTURE]: 0,
      [SystemCategory.BLOCKCHAIN_FINANCIAL]: 0,
      [SystemCategory.AI_CONSCIOUS]: 0,
      [SystemCategory.IDENTITY_ACCESS]: 0,
      [SystemCategory.COMMUNICATION_SOCIAL]: 0,
      [SystemCategory.GLOBAL_METAVERSE]: 0,
      [SystemCategory.ADMIN_DIVINE]: 0
    };

    for (const system of systems) {
      categories[system.category]++;
    }

    return {
      totalSystems: systems.length,
      categories,
      systems: systems.map(s => ({
        systemId: s.systemId,
        systemName: s.systemName,
        category: s.category,
        description: s.description,
        version: s.version,
        endpoint: s.endpoint,
        websocket: s.websocket,
        dataSchema: s.dataSchema,
        requiresAuth: s.requiresAuth,
        authMethod: s.authMethod,
        capabilities: s.capabilities
      })),
      timestamp: Date.now()
    };
  }

  /**
   * Authenticate with 3ONUPI
   */
  async authenticate3ONUPI(
    userId: string,
    systemId: string,
    permissions: string[],
    divineId?: string
  ): Promise<ThreeONUPIToken> {
    // Verify divine ID if provided
    if (divineId) {
      const divine = Object.values(DIVINE_IDS).find(d => d.id === divineId);
      if (!divine) {
        throw new Error('Invalid divine ID');
      }
      
      // Divine IDs have all permissions
      permissions = divine.permissions;
    }

    const token: ThreeONUPIToken = {
      token: this.generateToken(),
      userId,
      systemId,
      permissions,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      divineId
    };

    this.authTokens.set(token.token, token);
    this.emit('auth:token:created', userId, systemId);

    return token;
  }

  /**
   * Verify 3ONUPI token
   */
  verifyToken(token: string): ThreeONUPIToken | null {
    const authToken = this.authTokens.get(token);
    
    if (!authToken) {
      return null;
    }

    // Check expiration
    if (authToken.expiresAt < Date.now()) {
      this.authTokens.delete(token);
      return null;
    }

    return authToken;
  }

  /**
   * Revoke token
   */
  revokeToken(token: string): boolean {
    return this.authTokens.delete(token);
  }

  /**
   * Update system heartbeat
   */
  heartbeat(systemName: string): boolean {
    const system = this.registeredSystems.get(systemName);
    
    if (!system) {
      return false;
    }

    system.lastHeartbeat = Date.now();
    system.status = 'active';
    delete system.error;

    this.emit('system:heartbeat', systemName);
    return true;
  }

  /**
   * Get ecosystem statistics
   */
  getStatistics() {
    const systems = this.getRegisteredSystems();
    const active = systems.filter(s => s.status === 'active').length;
    const inactive = systems.filter(s => s.status === 'inactive').length;
    const errors = systems.filter(s => s.status === 'error').length;

    const byCategory: Record<string, number> = {};
    for (const system of systems) {
      byCategory[system.category] = (byCategory[system.category] || 0) + 1;
    }

    return {
      total: systems.length,
      active,
      inactive,
      errors,
      byCategory,
      tokens: this.authTokens.size
    };
  }

  /**
   * Check if system has permission
   */
  hasPermission(token: string, permission: string): boolean {
    const authToken = this.verifyToken(token);
    
    if (!authToken) {
      return false;
    }

    // Check for wildcard permission
    if (authToken.permissions.includes('*')) {
      return true;
    }

    return authToken.permissions.includes(permission);
  }

  /**
   * Get divine ID
   */
  getDivineID(id: string): DivineID | undefined {
    return Object.values(DIVINE_IDS).find(d => d.id === id);
  }

  // Private helper methods

  private checkHeartbeats(): void {
    const now = Date.now();
    const timeout = this.heartbeatIntervalMs * 3; // 90 seconds timeout

    for (const [name, system] of this.registeredSystems.entries()) {
      if (now - system.lastHeartbeat > timeout) {
        if (system.status === 'active') {
          system.status = 'inactive';
          this.emit('system:inactive', name);
        }
      }
    }
  }

  private generateToken(): string {
    return '3ONUPI-' + 
           Math.random().toString(36).substring(2) + 
           Date.now().toString(36) + 
           Math.random().toString(36).substring(2);
  }
}
