import { AuthHandler } from '../src/auth';
import { CachedToken, InMemoryTokenCache, TokenCache, deriveCacheKey } from '../src/token-cache';

const originalFetch = global.fetch;

function mockFetch(impl: jest.Mock) {
  global.fetch = impl;
}

afterEach(() => {
  global.fetch = originalFetch;
});

function tokenResponse(accessToken = 'tok_123', expiresIn = 3600) {
  return new Response(
    JSON.stringify({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: expiresIn,
      scope: 'transactions:read',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

const baseOpts = {
  clientId: 'test-client',
  clientSecret: 'test-secret',
  baseUrl: 'https://api.signdocs.com.br',
  scopes: ['transactions:read', 'transactions:write'],
};

describe('InMemoryTokenCache', () => {
  it('returns null for missing keys', () => {
    const cache = new InMemoryTokenCache();
    expect(cache.get('missing')).toBeNull();
  });

  it('stores and retrieves a valid token', () => {
    const cache = new InMemoryTokenCache();
    const token: CachedToken = {
      accessToken: 'tok_abc',
      expiresAt: Date.now() + 3600_000,
    };

    cache.set('k', token);

    const retrieved = cache.get('k');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.accessToken).toBe('tok_abc');
  });

  it('evicts entries whose expiresAt is in the past', () => {
    const cache = new InMemoryTokenCache();
    cache.set('expired', {
      accessToken: 'tok_expired',
      expiresAt: Date.now() - 10_000,
    });

    expect(cache.get('expired')).toBeNull();
  });

  it('deletes entries idempotently', () => {
    const cache = new InMemoryTokenCache();
    cache.set('k', { accessToken: 'x', expiresAt: Date.now() + 10_000 });

    cache.delete('k');
    cache.delete('k'); // second delete must not throw

    expect(cache.get('k')).toBeNull();
  });
});

describe('deriveCacheKey', () => {
  it('is deterministic regardless of scope order and trailing slash', () => {
    const a = deriveCacheKey('client_acme_123', 'https://api.example/', ['s1', 's2']);
    const b = deriveCacheKey('client_acme_123', 'https://api.example', ['s2', 's1']);

    expect(a).toBe(b);
  });

  it('differs when clientId differs', () => {
    const a = deriveCacheKey('client_acme_123', 'https://api.example', ['s1', 's2']);
    const b = deriveCacheKey('client_other', 'https://api.example', ['s1', 's2']);

    expect(a).not.toBe(b);
  });

  it('does not leak the clientId as plaintext', () => {
    const key = deriveCacheKey('client_acme_123', 'https://api.example', ['s1']);
    expect(key).not.toContain('client_acme_123');
  });

  it('uses the prefix + fixed-length hash shape', () => {
    const key = deriveCacheKey('client_x', 'https://api.example', ['s1']);
    // `signdocs.oauth.` is 15 chars; 32 hex chars follow.
    expect(key.startsWith('signdocs.oauth.')).toBe(true);
    expect(key.length).toBe(15 + 32);
    // Suffix must be lowercase hex only.
    expect(key.slice(15)).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('AuthHandler + TokenCache integration', () => {
  it('hits the injected cache and skips the HTTP call on cache hit', async () => {
    const fn = jest.fn(); // must not be called
    mockFetch(fn);

    const cache = new InMemoryTokenCache();
    const key = deriveCacheKey(baseOpts.clientId, baseOpts.baseUrl, baseOpts.scopes);
    cache.set(key, {
      accessToken: 'tok_prewarmed',
      expiresAt: Date.now() + 3_600_000,
    });

    const auth = new AuthHandler({ ...baseOpts, cache });
    const token = await auth.getAccessToken();

    expect(token).toBe('tok_prewarmed');
    expect(fn).not.toHaveBeenCalled();
  });

  it('fetches fresh when the cached entry is expired', async () => {
    const fn = jest.fn().mockResolvedValue(tokenResponse('tok_refreshed', 3600));
    mockFetch(fn);

    const cache = new InMemoryTokenCache();
    const key = deriveCacheKey(baseOpts.clientId, baseOpts.baseUrl, baseOpts.scopes);
    cache.set(key, {
      accessToken: 'tok_expired',
      expiresAt: Date.now() - 10_000,
    });

    const auth = new AuthHandler({ ...baseOpts, cache });
    const token = await auth.getAccessToken();

    expect(token).toBe('tok_refreshed');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('shares cached tokens across separate AuthHandler instances', async () => {
    const fn = jest.fn().mockResolvedValue(tokenResponse('tok_shared', 3600));
    mockFetch(fn);

    const cache: TokenCache = new InMemoryTokenCache();

    const auth1 = new AuthHandler({ ...baseOpts, cache });
    const t1 = await auth1.getAccessToken();
    expect(t1).toBe('tok_shared');
    expect(fn).toHaveBeenCalledTimes(1);

    // A fresh AuthHandler with the same cache MUST reuse the token.
    const auth2 = new AuthHandler({ ...baseOpts, cache });
    const t2 = await auth2.getAccessToken();
    expect(t2).toBe('tok_shared');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('writes to the cache after a successful fetch', async () => {
    const fn = jest.fn().mockResolvedValue(tokenResponse('tok_fresh', 3600));
    mockFetch(fn);

    const cache = new InMemoryTokenCache();
    const auth = new AuthHandler({ ...baseOpts, cache });
    await auth.getAccessToken();

    const key = deriveCacheKey(baseOpts.clientId, baseOpts.baseUrl, baseOpts.scopes);
    const entry = cache.get(key);
    expect(entry).not.toBeNull();
    expect(entry!.accessToken).toBe('tok_fresh');
  });

  it('invalidate() removes the entry from the injected cache', async () => {
    const fn = jest.fn()
      .mockResolvedValueOnce(tokenResponse('tok_1', 3600))
      .mockResolvedValueOnce(tokenResponse('tok_2', 3600));
    mockFetch(fn);

    const cache = new InMemoryTokenCache();
    const auth = new AuthHandler({ ...baseOpts, cache });

    await auth.getAccessToken();
    auth.invalidate();

    const t2 = await auth.getAccessToken();
    expect(t2).toBe('tok_2');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
