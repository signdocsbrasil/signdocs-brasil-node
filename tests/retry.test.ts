import { withRetry } from '../src/retry';
import { TimeoutError } from '../src/errors';

function mockResponse(status: number, body: any = {}, headers: Record<string, string> = {}): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(headers),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('withRetry', () => {
  it('should return immediately on success', async () => {
    const fn = jest.fn().mockResolvedValue(mockResponse(200, { ok: true }));
    const parse = async (res: Response) => res.json();
    const result = await withRetry({ maxRetries: 3 }, fn, parse);
    expect(result).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should return immediately on non-retryable error (400)', async () => {
    const fn = jest.fn().mockResolvedValue(mockResponse(400, { error: 'bad' }));
    const parse = async (res: Response) => {
      if (!res.ok) throw new Error('bad request');
      return res.json();
    };
    await expect(withRetry({ maxRetries: 3 }, fn, parse)).rejects.toThrow('bad request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on 429 and eventually succeed', async () => {
    const fn = jest.fn()
      .mockResolvedValueOnce(mockResponse(429, {}, { 'Retry-After': '0' }))
      .mockResolvedValueOnce(mockResponse(200, { ok: true }));
    const parse = async (res: Response) => res.json();
    const result = await withRetry({ maxRetries: 3 }, fn, parse);
    expect(result).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on 500', async () => {
    const fn = jest.fn()
      .mockResolvedValueOnce(mockResponse(500))
      .mockResolvedValueOnce(mockResponse(200, { recovered: true }));
    const parse = async (res: Response) => res.json();
    const result = await withRetry({ maxRetries: 3 }, fn, parse);
    expect(result).toEqual({ recovered: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on 503', async () => {
    const fn = jest.fn()
      .mockResolvedValueOnce(mockResponse(503))
      .mockResolvedValueOnce(mockResponse(200, { ok: true }));
    const parse = async (res: Response) => res.json();
    const result = await withRetry({ maxRetries: 3 }, fn, parse);
    expect(result).toEqual({ ok: true });
  });

  it('should stop after maxRetries', async () => {
    const fn = jest.fn().mockResolvedValue(mockResponse(500));
    const parse = async (res: Response) => {
      if (!res.ok) throw new Error('server error');
      return res.json();
    };
    await expect(withRetry({ maxRetries: 2 }, fn, parse)).rejects.toThrow('server error');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});
