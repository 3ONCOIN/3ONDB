import { 
  IntegrationHub, 
  ThreeONCoreConnector,
  ThreeONChainConnector,
  ThreeONPayConnector 
} from '../integrations/IntegrationHub';

describe('IntegrationHub', () => {
  let hub: IntegrationHub;

  beforeEach(() => {
    hub = new IntegrationHub();
  });

  test('should register connectors', () => {
    const connector = new ThreeONCoreConnector();
    hub.registerConnector(connector);
    
    const connectors = hub.getConnectors();
    expect(connectors).toContain('3ONCORE');
  });

  test('should connect to app', async () => {
    const connector = new ThreeONCoreConnector();
    hub.registerConnector(connector);
    
    const connected = await hub.connect('3ONCORE');
    expect(connected).toBe(true);
  });

  test('should disconnect from app', async () => {
    const connector = new ThreeONCoreConnector();
    hub.registerConnector(connector);
    
    await hub.connect('3ONCORE');
    await hub.disconnect('3ONCORE');
    
    const status = hub.getConnectionStatus();
    expect(status.get('3ONCORE')).toBe(false);
  });

  test('should query from app', async () => {
    const connector = new ThreeONCoreConnector();
    hub.registerConnector(connector);
    await hub.connect('3ONCORE');
    
    const records = await hub.query('3ONCORE', {});
    expect(Array.isArray(records)).toBe(true);
  });

  test('should write to app', async () => {
    const connector = new ThreeONCoreConnector();
    hub.registerConnector(connector);
    await hub.connect('3ONCORE');
    
    const id = await hub.write('3ONCORE', { data: 'test' });
    expect(id).toBeTruthy();
    expect(id).toContain('core-');
  });

  test('should query all apps', async () => {
    hub.registerConnector(new ThreeONCoreConnector());
    hub.registerConnector(new ThreeONChainConnector());
    
    await hub.connect('3ONCORE');
    await hub.connect('3ONCHAIN');
    
    const results = await hub.queryAll({});
    
    expect(results.size).toBe(2);
    expect(results.has('3ONCORE')).toBe(true);
    expect(results.has('3ONCHAIN')).toBe(true);
  });

  test('should get connection status', async () => {
    hub.registerConnector(new ThreeONCoreConnector());
    hub.registerConnector(new ThreeONPayConnector());
    
    await hub.connect('3ONCORE');
    
    const status = hub.getConnectionStatus();
    
    expect(status.get('3ONCORE')).toBe(true);
    expect(status.get('3ONPAY')).toBe(false);
  });

  test('should throw error for unknown connector', async () => {
    await expect(hub.connect('UNKNOWN')).rejects.toThrow();
  });
});

describe('ThreeONCoreConnector', () => {
  let connector: ThreeONCoreConnector;

  beforeEach(() => {
    connector = new ThreeONCoreConnector();
  });

  test('should have correct app name', () => {
    expect(connector.appName).toBe('3ONCORE');
  });

  test('should connect and disconnect', async () => {
    expect(connector.isConnected()).toBe(false);
    
    await connector.connect();
    expect(connector.isConnected()).toBe(true);
    
    await connector.disconnect();
    expect(connector.isConnected()).toBe(false);
  });

  test('should throw error when not connected', async () => {
    await expect(connector.query({})).rejects.toThrow('Not connected to 3ONCORE');
    await expect(connector.write({})).rejects.toThrow('Not connected to 3ONCORE');
  });
});

describe('ThreeONChainConnector', () => {
  let connector: ThreeONChainConnector;

  beforeEach(() => {
    connector = new ThreeONChainConnector();
  });

  test('should have correct app name', () => {
    expect(connector.appName).toBe('3ONCHAIN');
  });

  test('should write with chain prefix', async () => {
    await connector.connect();
    const id = await connector.write({ tx: 'data' });
    expect(id).toContain('chain-');
  });
});

describe('ThreeONPayConnector', () => {
  let connector: ThreeONPayConnector;

  beforeEach(() => {
    connector = new ThreeONPayConnector();
  });

  test('should have correct app name', () => {
    expect(connector.appName).toBe('3ONPAY');
  });

  test('should write with pay prefix', async () => {
    await connector.connect();
    const id = await connector.write({ payment: 'data' });
    expect(id).toContain('pay-');
  });
});
