import { AuthHandler } from '../src/auth';
import { AuthenticationError } from '../src/errors';

const originalFetch = global.fetch;

function mockFetch(impl: jest.Mock) {
  global.fetch = impl;
}

afterEach(() => {
  global.fetch = originalFetch;
});

function tokenResponse(accessToken = 'tok_123', expiresIn = 3600) {
  return new Response(
    JSON.stringify({ access_token: accessToken, token_type: 'bearer', expires_in: expiresIn, scope: 'transactions:read' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('AuthHandler', () => {
  const baseOpts = {
    clientId: 'client-1',
    clientSecret: 'secret-1',
    baseUrl: 'https://api.signdocs.com.br',
    scopes: ['transactions:read', 'transactions:write'],
  };

  it('should fetch a token via client_secret flow', async () => {
    const fn = jest.fn().mockResolvedValue(tokenResponse());
    mockFetch(fn);

    const auth = new AuthHandler(baseOpts);
    const token = await auth.getAccessToken();

    expect(token).toBe('tok_123');
    expect(fn).toHaveBeenCalledTimes(1);

    // Verify form-urlencoded content type
    const call = fn.mock.calls[0];
    expect(call[0]).toBe('https://api.signdocs.com.br/oauth2/token');
    expect(call[1].headers['Content-Type']).toBe('application/x-www-form-urlencoded');

    // Verify body contains client_secret
    const body = call[1].body as string;
    expect(body).toContain('grant_type=client_credentials');
    expect(body).toContain('client_id=client-1');
    expect(body).toContain('client_secret=secret-1');
    expect(body).toContain('scope=transactions%3Aread+transactions%3Awrite');
  });

  it('should fetch token via private_key_jwt flow', async () => {
    const fn = jest.fn().mockResolvedValue(tokenResponse());
    mockFetch(fn);

    const { generateKeyPairSync } = require('crypto');
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const pem = privateKey.export({ type: 'sec1', format: 'pem' }) as string;

    const auth = new AuthHandler({
      clientId: 'client-1',
      privateKey: pem,
      kid: 'key-001',
      baseUrl: 'https://api.signdocs.com.br',
      scopes: ['transactions:read'],
    });

    const token = await auth.getAccessToken();
    expect(token).toBe('tok_123');

    const body = fn.mock.calls[0][1].body as string;
    expect(body).toContain('client_assertion_type=');
    expect(body).toContain('client_assertion=');
    expect(body).not.toContain('client_secret=');
  });

  it('should cache token and return cached value', async () => {
    const fn = jest.fn().mockResolvedValue(tokenResponse('tok_cached', 3600));
    mockFetch(fn);

    const auth = new AuthHandler(baseOpts);
    const t1 = await auth.getAccessToken();
    const t2 = await auth.getAccessToken();

    expect(t1).toBe('tok_cached');
    expect(t2).toBe('tok_cached');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should refresh token when within 30s buffer of expiry', async () => {
    const fn = jest.fn()
      .mockResolvedValueOnce(tokenResponse('tok_1', 20)) // expires in 20s (< 30s buffer)
      .mockResolvedValueOnce(tokenResponse('tok_2', 3600));
    mockFetch(fn);

    const auth = new AuthHandler(baseOpts);
    const t1 = await auth.getAccessToken();
    expect(t1).toBe('tok_1');

    // Next call should trigger refresh since 20s < 30s buffer
    const t2 = await auth.getAccessToken();
    expect(t2).toBe('tok_2');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not refresh when token still has > 30s remaining', async () => {
    const fn = jest.fn().mockResolvedValue(tokenResponse('tok_long', 3600));
    mockFetch(fn);

    const auth = new AuthHandler(baseOpts);
    await auth.getAccessToken();
    await auth.getAccessToken();
    await auth.getAccessToken();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should share concurrent refresh promises', async () => {
    let resolvePromise: (value: Response) => void;
    const fn = jest.fn().mockReturnValue(
      new Promise<Response>((resolve) => { resolvePromise = resolve; }),
    );
    mockFetch(fn);

    const auth = new AuthHandler(baseOpts);
    const p1 = auth.getAccessToken();
    const p2 = auth.getAccessToken();

    resolvePromise!(tokenResponse('tok_shared'));

    const [t1, t2] = await Promise.all([p1, p2]);
    expect(t1).toBe('tok_shared');
    expect(t2).toBe('tok_shared');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw AuthenticationError on non-200 response', async () => {
    const fn = jest.fn().mockResolvedValue(
      new Response('invalid credentials', { status: 401 }),
    );
    mockFetch(fn);

    const auth = new AuthHandler(baseOpts);
    await expect(auth.getAccessToken()).rejects.toThrow(AuthenticationError);
  });

  it('should build token URL from baseUrl', async () => {
    const fn = jest.fn().mockResolvedValue(tokenResponse());
    mockFetch(fn);

    const auth = new AuthHandler({
      ...baseOpts,
      baseUrl: 'https://custom.api.com',
    });
    await auth.getAccessToken();

    expect(fn.mock.calls[0][0]).toBe('https://custom.api.com/oauth2/token');
  });
});
