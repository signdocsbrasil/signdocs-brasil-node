import { HttpClient } from '../src/http-client';
import { AuthHandler } from '../src/auth';

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

describe('Custom HTTP Client', () => {
  it('should use the custom fetch function instead of global fetch', async () => {
    const customFetch = jest.fn().mockResolvedValue(mockResponse(200, { ok: true }));

    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30000,
      maxRetries: 0,
      auth: mockAuth(),
      fetchFn: customFetch,
    });

    await client.request({ method: 'GET', path: '/v1/test' });

    expect(customFetch).toHaveBeenCalledTimes(1);
    const [url, init] = customFetch.mock.calls[0];
    expect(url).toContain('/v1/test');
    expect(init.method).toBe('GET');
  });

  it('should pass headers and body through custom fetch', async () => {
    const customFetch = jest.fn().mockResolvedValue(mockResponse(200, { id: '1' }));

    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30000,
      maxRetries: 0,
      auth: mockAuth(),
      fetchFn: customFetch,
    });

    await client.request({
      method: 'POST',
      path: '/v1/transactions',
      body: { name: 'test' },
    });

    const [, init] = customFetch.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ name: 'test' }));
    expect(init.headers['Authorization']).toBe('Bearer test-token');
  });

  it('should not call global fetch when custom fetch is provided', async () => {
    const originalFetch = global.fetch;
    const globalFetchSpy = jest.fn();
    global.fetch = globalFetchSpy;

    try {
      const customFetch = jest.fn().mockResolvedValue(mockResponse(200, { ok: true }));

      const client = new HttpClient({
        baseUrl: 'https://api.signdocs.com.br',
        timeout: 30000,
        maxRetries: 0,
        auth: mockAuth(),
        fetchFn: customFetch,
      });

      await client.request({ method: 'GET', path: '/v1/test' });

      expect(customFetch).toHaveBeenCalledTimes(1);
      expect(globalFetchSpy).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should fall back to global fetch when no custom fetch is provided', async () => {
    const originalFetch = global.fetch;
    const globalFetchSpy = jest.fn().mockResolvedValue(mockResponse(200, { ok: true }));
    global.fetch = globalFetchSpy;

    try {
      const client = new HttpClient({
        baseUrl: 'https://api.signdocs.com.br',
        timeout: 30000,
        maxRetries: 0,
        auth: mockAuth(),
      });

      await client.request({ method: 'GET', path: '/v1/test' });

      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
