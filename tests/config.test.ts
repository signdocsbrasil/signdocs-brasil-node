import { resolveConfig, DEFAULT_BASE_URL, DEFAULT_TIMEOUT, DEFAULT_MAX_RETRIES, DEFAULT_SCOPES } from '../src/config';

describe('resolveConfig', () => {
  it('should resolve defaults with client_secret auth', () => {
    const config = resolveConfig({
      clientId: 'test-client',
      clientSecret: 'test-secret',
    });

    expect(config.clientId).toBe('test-client');
    expect(config.clientSecret).toBe('test-secret');
    expect(config.baseUrl).toBe(DEFAULT_BASE_URL);
    expect(config.timeout).toBe(DEFAULT_TIMEOUT);
    expect(config.maxRetries).toBe(DEFAULT_MAX_RETRIES);
    expect(config.scopes).toEqual(DEFAULT_SCOPES);
  });

  it('should allow custom values', () => {
    const config = resolveConfig({
      clientId: 'test-client',
      clientSecret: 'test-secret',
      baseUrl: 'https://custom.api.com',
      timeout: 10_000,
      maxRetries: 3,
      scopes: ['transactions:read'],
    });

    expect(config.baseUrl).toBe('https://custom.api.com');
    expect(config.timeout).toBe(10_000);
    expect(config.maxRetries).toBe(3);
    expect(config.scopes).toEqual(['transactions:read']);
  });

  it('should throw if clientId is missing', () => {
    expect(() => resolveConfig({ clientId: '', clientSecret: 'secret' })).toThrow('clientId is required');
  });

  it('should throw if no auth method provided', () => {
    expect(() => resolveConfig({ clientId: 'test' })).toThrow('Either clientSecret or privateKey+kid is required');
  });

  it('should throw if privateKey provided without kid', () => {
    expect(() => resolveConfig({ clientId: 'test', privateKey: 'key' })).toThrow('kid is required');
  });

  it('should accept privateKey + kid auth', () => {
    const config = resolveConfig({
      clientId: 'test',
      privateKey: '-----BEGIN EC PRIVATE KEY-----\nfake\n-----END EC PRIVATE KEY-----',
      kid: 'key-001',
    });
    expect(config.privateKey).toBeDefined();
    expect(config.kid).toBe('key-001');
  });
});
