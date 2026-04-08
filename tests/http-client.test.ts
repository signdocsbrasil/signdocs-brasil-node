import { HttpClient } from '../src/http-client';
import { AuthHandler } from '../src/auth';
import {
  BadRequestError,
  NotFoundError,
  RateLimitError,
  InternalServerError,
  ConnectionError,
} from '../src/errors';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function mockAuth(): AuthHandler {
  const auth = {
    getAccessToken: jest.fn().mockResolvedValue('test-token'),
  } as unknown as AuthHandler;
  return auth;
}

function mockResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Response {
  const h = new Headers({ 'Content-Type': 'application/json', ...headers });
  return new Response(JSON.stringify(body), { status, headers: h });
}

function createClient(auth?: AuthHandler): HttpClient {
  return new HttpClient({
    baseUrl: 'https://api.signdocs.com.br',
    timeout: 30000,
    maxRetries: 0,
    auth: auth ?? mockAuth(),
  });
}

describe('HttpClient', () => {
  it('should include Authorization header with Bearer token', async () => {
    const fn = jest.fn().mockResolvedValue(mockResponse(200, { ok: true }));
    global.fetch = fn;

    const client = createClient();
    await client.request({ method: 'GET', path: '/v1/test' });

    const headers = fn.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('should include User-Agent header', async () => {
    const fn = jest.fn().mockResolvedValue(mockResponse(200, { ok: true }));
    global.fetch = fn;

    const client = createClient();
    await client.request({ method: 'GET', path: '/v1/test' });

    const headers = fn.mock.calls[0][1].headers;
    expect(headers['User-Agent']).toBe('signdocs-brasil-node/1.0.0');
  });

  it('should skip Authorization when noAuth is true', async () => {
    const fn = jest.fn().mockResolvedValue(mockResponse(200, { ok: true }));
    global.fetch = fn;

    const client = createClient();
    await client.request({ method: 'GET', path: '/health', noAuth: true });

    const headers = fn.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('should send JSON body with Content-Type header', async () => {
    const fn = jest.fn().mockResolvedValue(mockResponse(200, { id: '1' }));
    global.fetch = fn;

    const client = createClient();
    await client.request({
      method: 'POST',
      path: '/v1/transactions',
      body: { name: 'test' },
    });

    const call = fn.mock.calls[0];
    expect(call[1].headers['Content-Type']).toBe('application/json');
    expect(call[1].body).toBe(JSON.stringify({ name: 'test' }));
  });

  it('should append query parameters to URL', async () => {
    const fn = jest.fn().mockResolvedValue(mockResponse(200, { items: [] }));
    global.fetch = fn;

    const client = createClient();
    await client.request({
      method: 'GET',
      path: '/v1/transactions',
      query: { status: 'active', limit: 10 },
    });

    const url = fn.mock.calls[0][0] as string;
    expect(url).toContain('status=active');
    expect(url).toContain('limit=10');
  });

  it('should omit undefined query parameters', async () => {
    const fn = jest.fn().mockResolvedValue(mockResponse(200, { items: [] }));
    global.fetch = fn;

    const client = createClient();
    await client.request({
      method: 'GET',
      path: '/v1/transactions',
      query: { status: 'active', nextToken: undefined },
    });

    const url = fn.mock.calls[0][0] as string;
    expect(url).toContain('status=active');
    expect(url).not.toContain('nextToken');
  });

  it('should return undefined for 204 responses', async () => {
    const fn = jest.fn().mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    global.fetch = fn;

    const client = createClient();
    const result = await client.request({ method: 'DELETE', path: '/v1/webhooks/123' });

    expect(result).toBeUndefined();
  });

  it('should throw BadRequestError on 400', async () => {
    const fn = jest.fn().mockResolvedValue(
      mockResponse(400, { type: 'about:blank', title: 'Bad Request', status: 400, detail: 'Invalid input' }),
    );
    global.fetch = fn;

    const client = createClient();
    await expect(
      client.request({ method: 'POST', path: '/v1/test' }),
    ).rejects.toThrow(BadRequestError);
  });

  it('should throw NotFoundError on 404', async () => {
    const fn = jest.fn().mockResolvedValue(
      mockResponse(404, { type: 'about:blank', title: 'Not Found', status: 404 }),
    );
    global.fetch = fn;

    const client = createClient();
    await expect(
      client.request({ method: 'GET', path: '/v1/transactions/missing' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw RateLimitError on 429 with retryAfterSeconds', async () => {
    const fn = jest.fn().mockResolvedValue(
      mockResponse(429, { type: 'about:blank', title: 'Rate Limited', status: 429 }, { 'Retry-After': '5' }),
    );
    global.fetch = fn;

    const client = createClient();
    try {
      await client.request({ method: 'GET', path: '/v1/test' });
      fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(RateLimitError);
      expect((e as RateLimitError).retryAfterSeconds).toBe(5);
    }
  });

  it('should add X-Idempotency-Key via requestWithIdempotency', async () => {
    const fn = jest.fn().mockResolvedValue(mockResponse(200, { id: 'tx_1' }));
    global.fetch = fn;

    const client = createClient();
    await client.requestWithIdempotency(
      { method: 'POST', path: '/v1/transactions', body: { name: 'test' } },
      'custom-key-123',
    );

    const headers = fn.mock.calls[0][1].headers;
    expect(headers['X-Idempotency-Key']).toBe('custom-key-123');
  });

  it('should auto-generate idempotency key when not provided', async () => {
    const fn = jest.fn().mockResolvedValue(mockResponse(200, { id: 'tx_1' }));
    global.fetch = fn;

    const client = createClient();
    await client.requestWithIdempotency(
      { method: 'POST', path: '/v1/transactions', body: { name: 'test' } },
    );

    const headers = fn.mock.calls[0][1].headers;
    expect(headers['X-Idempotency-Key']).toBeDefined();
    expect(typeof headers['X-Idempotency-Key']).toBe('string');
  });
});
