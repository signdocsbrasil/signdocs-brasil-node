import { HttpClient } from '../src/http-client';
import { AuthHandler } from '../src/auth';
import { TimeoutError } from '../src/errors';

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

describe('Per-request timeout', () => {
  it('should use per-request timeout instead of default timeout', async () => {
    // Create a fetch that delays 150ms
    const customFetch = jest.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(mockResponse(200, { ok: true })), 150);
          init.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );

    // Default timeout is 30s, but per-request is 50ms
    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30000,
      maxRetries: 0,
      auth: mockAuth(),
      fetchFn: customFetch,
    });

    await expect(
      client.request({ method: 'GET', path: '/v1/test', timeout: 50 }),
    ).rejects.toThrow(TimeoutError);
  });

  it('should use default timeout when per-request timeout is not set', async () => {
    // Create a fetch that delays 150ms — well within the 30s default
    const customFetch = jest.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(mockResponse(200, { ok: true })), 150);
          init.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );

    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30000,
      maxRetries: 0,
      auth: mockAuth(),
      fetchFn: customFetch,
    });

    // No per-request timeout; 150ms is well within the 30s default
    const result = await client.request({ method: 'GET', path: '/v1/test' });
    expect(result).toEqual({ ok: true });
  });

  it('should allow a longer per-request timeout to override a short default', async () => {
    // Default is 50ms (very short), per-request is 5000ms
    const customFetch = jest.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(mockResponse(200, { ok: true })), 100);
          init.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );

    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 50,
      maxRetries: 0,
      auth: mockAuth(),
      fetchFn: customFetch,
    });

    // Per-request timeout of 5000ms overrides the 50ms default
    const result = await client.request({ method: 'GET', path: '/v1/test', timeout: 5000 });
    expect(result).toEqual({ ok: true });
  });

  it('should pass per-request timeout through RequestOptions', async () => {
    const customFetch = jest.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(mockResponse(200, { ok: true })), 200);
          init.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );

    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30000,
      maxRetries: 0,
      auth: mockAuth(),
      fetchFn: customFetch,
    });

    // Set a timeout shorter than the 200ms delay in the mock
    await expect(
      client.request({ method: 'GET', path: '/v1/test', timeout: 100 }),
    ).rejects.toThrow(TimeoutError);

    // Set a timeout longer than the 200ms delay
    const result = await client.request({ method: 'GET', path: '/v1/test', timeout: 5000 });
    expect(result).toEqual({ ok: true });
  });
});
