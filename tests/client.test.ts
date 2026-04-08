import { SignDocsBrasilClient } from '../src/client';

describe('SignDocsBrasilClient', () => {
  it('should create client with client_secret auth', () => {
    const client = new SignDocsBrasilClient({
      clientId: 'test-client',
      clientSecret: 'test-secret',
    });

    expect(client.health).toBeDefined();
    expect(client.transactions).toBeDefined();
    expect(client.documents).toBeDefined();
    expect(client.steps).toBeDefined();
    expect(client.signing).toBeDefined();
    expect(client.evidence).toBeDefined();
    expect(client.verification).toBeDefined();
    expect(client.users).toBeDefined();
    expect(client.webhooks).toBeDefined();
    expect(client.documentGroups).toBeDefined();
  });

  it('should create client with privateKey auth', () => {
    const client = new SignDocsBrasilClient({
      clientId: 'test-client',
      privateKey: '-----BEGIN EC PRIVATE KEY-----\nfake\n-----END EC PRIVATE KEY-----',
      kid: 'key-001',
    });

    expect(client.transactions).toBeDefined();
  });

  it('should throw on invalid config', () => {
    expect(() => new SignDocsBrasilClient({ clientId: '' })).toThrow();
    expect(() => new SignDocsBrasilClient({ clientId: 'test' })).toThrow();
  });
});
