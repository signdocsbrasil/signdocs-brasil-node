import { HttpClient } from '../src/http-client';
import { AuthHandler } from '../src/auth';
import { Logger } from '../src/config';

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

function mockLogger(): Logger {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

describe('Logger', () => {
  it('should call logger.info on successful requests', async () => {
    const logger = mockLogger();
    const customFetch = jest.fn().mockResolvedValue(mockResponse(200, { ok: true }));

    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30000,
      maxRetries: 0,
      auth: mockAuth(),
      fetchFn: customFetch,
      logger,
    });

    await client.request({ method: 'GET', path: '/v1/test' });

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'request completed',
      expect.objectContaining({
        method: 'GET',
        path: '/v1/test',
        status: 200,
        durationMs: expect.any(Number),
      }),
    );
  });

  it('should call logger.warn on error responses', async () => {
    const logger = mockLogger();
    const customFetch = jest.fn().mockResolvedValue(
      mockResponse(400, { type: 'about:blank', title: 'Bad Request', status: 400, detail: 'Invalid' }),
    );

    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30000,
      maxRetries: 0,
      auth: mockAuth(),
      fetchFn: customFetch,
      logger,
    });

    await expect(
      client.request({ method: 'POST', path: '/v1/test' }),
    ).rejects.toThrow();

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'request failed',
      expect.objectContaining({
        method: 'POST',
        path: '/v1/test',
        status: 400,
        durationMs: expect.any(Number),
      }),
    );
  });

  it('should NOT include Authorization headers in log output', async () => {
    const logger = mockLogger();
    const customFetch = jest.fn().mockResolvedValue(mockResponse(200, { ok: true }));

    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30000,
      maxRetries: 0,
      auth: mockAuth(),
      fetchFn: customFetch,
      logger,
    });

    await client.request({ method: 'GET', path: '/v1/test' });

    // Inspect all calls to all logger methods
    const allLogCalls = [
      ...((logger.debug as jest.Mock).mock.calls),
      ...((logger.info as jest.Mock).mock.calls),
      ...((logger.warn as jest.Mock).mock.calls),
      ...((logger.error as jest.Mock).mock.calls),
    ];

    for (const call of allLogCalls) {
      const serialized = JSON.stringify(call);
      expect(serialized).not.toContain('Authorization');
      expect(serialized).not.toContain('Bearer');
      expect(serialized).not.toContain('test-token');
    }
  });

  it('should not throw when logger is undefined', async () => {
    const customFetch = jest.fn().mockResolvedValue(mockResponse(200, { ok: true }));

    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30000,
      maxRetries: 0,
      auth: mockAuth(),
      fetchFn: customFetch,
      // no logger provided
    });

    await expect(
      client.request({ method: 'GET', path: '/v1/test' }),
    ).resolves.toEqual({ ok: true });
  });

  it('should call logger.info on 204 responses', async () => {
    const logger = mockLogger();
    const customFetch = jest.fn().mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30000,
      maxRetries: 0,
      auth: mockAuth(),
      fetchFn: customFetch,
      logger,
    });

    await client.request({ method: 'DELETE', path: '/v1/webhooks/123' });

    expect(logger.info).toHaveBeenCalledWith(
      'request completed',
      expect.objectContaining({
        method: 'DELETE',
        path: '/v1/webhooks/123',
        status: 204,
      }),
    );
  });

  it('should call logger.warn on connection errors', async () => {
    const logger = mockLogger();
    const customFetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const client = new HttpClient({
      baseUrl: 'https://api.signdocs.com.br',
      timeout: 30000,
      maxRetries: 0,
      auth: mockAuth(),
      fetchFn: customFetch,
      logger,
    });

    await expect(
      client.request({ method: 'GET', path: '/v1/test' }),
    ).rejects.toThrow();

    expect(logger.warn).toHaveBeenCalledWith(
      'request failed',
      expect.objectContaining({
        method: 'GET',
        path: '/v1/test',
        error: 'connection',
      }),
    );
  });
});
