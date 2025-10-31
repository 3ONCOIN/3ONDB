import { EcosystemDiscoveryService, ConnectionType } from '../ecosystem/EcosystemDiscoveryService';
import { SystemCategory, DIVINE_IDS } from '../ecosystem/schemas';

describe('EcosystemDiscoveryService', () => {
  let service: EcosystemDiscoveryService;

  beforeEach(() => {
    service = new EcosystemDiscoveryService();
  });

  afterEach(() => {
    service.stop();
  });

  test('should initialize with default 3ON systems', () => {
    const systems = service.getRegisteredSystems();
    
    // Should have 40+ systems registered
    expect(systems.length).toBeGreaterThanOrEqual(40);
  });

  test('should discover entire ecosystem', async () => {
    const discovery = await service.discoverEcosystem();
    
    expect(discovery.totalSystems).toBeGreaterThanOrEqual(40);
    expect(discovery.systems).toBeDefined();
    expect(discovery.categories).toBeDefined();
    expect(discovery.timestamp).toBeGreaterThan(0);
  });

  test('should get systems by category', () => {
    const coreSystems = service.getSystemsByCategory(SystemCategory.CORE_INFRASTRUCTURE);
    const blockchainSystems = service.getSystemsByCategory(SystemCategory.BLOCKCHAIN_FINANCIAL);
    const aiSystems = service.getSystemsByCategory(SystemCategory.AI_CONSCIOUS);
    
    expect(coreSystems.length).toBeGreaterThan(0);
    expect(blockchainSystems.length).toBeGreaterThan(0);
    expect(aiSystems.length).toBeGreaterThan(0);
  });

  test('should get specific system', () => {
    const chain = service.getSystem('3ONCHAIN');
    
    expect(chain).toBeDefined();
    expect(chain?.systemName).toBe('3ONCHAIN');
    expect(chain?.category).toBe(SystemCategory.BLOCKCHAIN_FINANCIAL);
  });

  test('should register new system', async () => {
    const registered = await service.registerSystem({
      systemName: 'TESTYSTEM',
      category: SystemCategory.CORE_INFRASTRUCTURE,
      endpoint: '/api/v1/test',
      version: '1.0.0',
      authMethod: '3ONUPI'
    });
    
    expect(registered.systemName).toBe('TESTYSTEM');
    expect(registered.status).toBe('active');
  });

  test('should unregister system', async () => {
    await service.registerSystem({
      systemName: 'TEMPSYSTEM',
      category: SystemCategory.CORE_INFRASTRUCTURE,
      endpoint: '/api/v1/temp',
      version: '1.0.0',
      authMethod: '3ONUPI'
    });
    
    const result = await service.unregisterSystem('TEMPSYSTEM');
    expect(result).toBe(true);
    
    const system = service.getSystem('TEMPSYSTEM');
    expect(system).toBeUndefined();
  });

  test('should authenticate with 3ONUPI', async () => {
    const token = await service.authenticate3ONUPI(
      'user-123',
      '3ON-CHAIN-1001',
      ['read', 'write']
    );
    
    expect(token.token).toBeDefined();
    expect(token.userId).toBe('user-123');
    expect(token.systemId).toBe('3ON-CHAIN-1001');
    expect(token.permissions).toContain('read');
    expect(token.permissions).toContain('write');
  });

  test('should authenticate with divine ID', async () => {
    const token = await service.authenticate3ONUPI(
      'admin',
      '3ON-CORE-0001',
      [],
      DIVINE_IDS.CREATOR.id
    );
    
    expect(token.divineId).toBe(DIVINE_IDS.CREATOR.id);
    expect(token.permissions).toContain('*');
  });

  test('should verify valid token', async () => {
    const token = await service.authenticate3ONUPI(
      'user-456',
      '3ON-PAY-1002',
      ['charge', 'refund']
    );
    
    const verified = service.verifyToken(token.token);
    
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe('user-456');
  });

  test('should reject invalid token', () => {
    const verified = service.verifyToken('invalid-token');
    expect(verified).toBeNull();
  });

  test('should revoke token', async () => {
    const token = await service.authenticate3ONUPI(
      'user-789',
      '3ON-BANK-1003',
      ['read']
    );
    
    const revoked = service.revokeToken(token.token);
    expect(revoked).toBe(true);
    
    const verified = service.verifyToken(token.token);
    expect(verified).toBeNull();
  });

  test('should handle heartbeat', () => {
    const result = service.heartbeat('3ONCHAIN');
    expect(result).toBe(true);
  });

  test('should get ecosystem statistics', () => {
    const stats = service.getStatistics();
    
    expect(stats.total).toBeGreaterThanOrEqual(40);
    expect(stats.active).toBeGreaterThan(0);
    expect(stats.byCategory).toBeDefined();
  });

  test('should check permissions', async () => {
    const token = await service.authenticate3ONUPI(
      'user-abc',
      '3ON-WALLET-1008',
      ['send', 'receive']
    );
    
    expect(service.hasPermission(token.token, 'send')).toBe(true);
    expect(service.hasPermission(token.token, 'receive')).toBe(true);
    expect(service.hasPermission(token.token, 'admin')).toBe(false);
  });

  test('should have wildcard permission for divine ID', async () => {
    const token = await service.authenticate3ONUPI(
      'god',
      '3ON-CORE-0001',
      [],
      DIVINE_IDS.CREATOR.id // Use CREATOR which has * permission
    );
    
    expect(service.hasPermission(token.token, 'anything')).toBe(true);
    expect(service.hasPermission(token.token, 'everything')).toBe(true);
  });

  test('should get divine ID', () => {
    const creator = service.getDivineID(DIVINE_IDS.CREATOR.id);
    
    expect(creator).toBeDefined();
    expect(creator?.name).toBe('L3ON CREATOR');
    expect(creator?.level).toBe('CREATOR');
  });

  test('should start and stop service', () => {
    service.start();
    service.stop();
    // Should not throw
  });
});
