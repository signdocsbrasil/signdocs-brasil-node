import { HttpClient } from '../src/http-client';
import { AuthHandler } from '../src/auth';
import { ResponseMetadata } from '../src/response-metadata';

function mockAuth(): AuthHandler {
  return {
    getAccessToken: jest.fn().mockResolvedValue('test-token'),
  } as unknown as AuthHandler;
}

function mockResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Response {
  const h = new Headers({ 'Content-Type': 'application/json', ...headers });
  return new Response(JSON.stringify(body), { status, headers: h });
}

describe('onResponse observer', () => {
  it('is fired with ResponseMetadata after every response', async () => {
    const fn = jest.fn().mockResolvedValue(
      mockResponse(
        200,
        { ok: true },
        {
          'RateLimit-Limit': '2000',
          'RateLimit-Remaining': '1998',
          'X-Request-Id': 'req_obs_1',
        },
      ),
    );
    global.fetch = fn;

    const observed: ResponseMetadata[] = [];
    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30_000,
      maxRetries: 0,
      auth: mockAuth(),
      onResponse: (m) => observed.push(m),
    });

    await client.request({ method: 'GET', path: '/v1/test' });

    expect(observed).toHaveLength(1);
    expect(observed[0].rateLimitLimit).toBe(2000);
    expect(observed[0].rateLimitRemaining).toBe(1998);
    expect(observed[0].requestId).toBe('req_obs_1');
    expect(observed[0].statusCode).toBe(200);
    expect(observed[0].method).toBe('GET');
    expect(observed[0].path).toBe('/v1/test');
  });

  it('includes query string in the observed path', async () => {
    const fn = jest.fn().mockResolvedValue(mockResponse(200, { items: [] }));
    global.fetch = fn;

    const observed: ResponseMetadata[] = [];
    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30_000,
      maxRetries: 0,
      auth: mockAuth(),
      onResponse: (m) => observed.push(m),
    });

    await client.request({
      method: 'GET',
      path: '/v1/transactions',
      query: { status: 'active', limit: 10 },
    });

    expect(observed).toHaveLength(1);
    expect(observed[0].path).toContain('/v1/transactions');
    expect(observed[0].path).toContain('status=active');
    expect(observed[0].path).toContain('limit=10');
  });

  it('does not break the request when the callback throws', async () => {
    const fn = jest.fn().mockResolvedValue(mockResponse(200, { ok: true }));
    global.fetch = fn;

    const warn = jest.fn();
    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30_000,
      maxRetries: 0,
      auth: mockAuth(),
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn,
        error: jest.fn(),
      },
      onResponse: () => {
        throw new Error('observer failed');
      },
    });

    const result = await client.request<{ ok: boolean }>({ method: 'GET', path: '/v1/test' });

    // Must not throw: observability must never break the request path.
    expect(result).toEqual({ ok: true });
    // Logger warns about the callback exception.
    expect(warn).toHaveBeenCalledWith(
      'onResponse callback threw',
      expect.objectContaining({ method: 'GET', path: '/v1/test' }),
    );
  });

  it('is fired for error responses too (so observers see rate-limit and deprecation even on 4xx)', async () => {
    const fn = jest.fn().mockResolvedValue(
      mockResponse(
        429,
        { type: 'about:blank', title: 'Rate Limited', status: 429 },
        { 'RateLimit-Remaining': '0' },
      ),
    );
    global.fetch = fn;

    const observed: ResponseMetadata[] = [];
    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30_000,
      maxRetries: 0,
      auth: mockAuth(),
      onResponse: (m) => observed.push(m),
    });

    await expect(
      client.request({ method: 'GET', path: '/v1/test' }),
    ).rejects.toBeDefined();

    expect(observed).toHaveLength(1);
    expect(observed[0].statusCode).toBe(429);
    expect(observed[0].rateLimitRemaining).toBe(0);
  });
});
