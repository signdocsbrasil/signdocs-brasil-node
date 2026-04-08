import { SignDocsBrasilClient } from '../src/client';
import { ServiceUnavailableError, RateLimitError, BadRequestError } from '../src/errors';

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
});

const TOKEN_RESPONSE = {
  access_token: 'test-token',
  token_type: 'Bearer',
  expires_in: 900,
  scope: 'transactions:read',
};

const SUCCESS_BODY = {
  tenantId: 'abc123',
  transactionId: 'tx-001',
  status: 'CREATED',
  purpose: 'DOCUMENT_SIGNATURE',
  policy: { profile: 'CLICK_ONLY' },
  signer: { name: 'Test', userExternalId: 'u1' },
  steps: [],
  expiresAt: '2024-12-31T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  const h = new Headers({ 'Content-Type': 'application/json', ...headers });
  return new Response(JSON.stringify(body), { status, headers: h });
}

function errorBody(status: number) {
  return {
    type: `https://api.signdocs.com.br/errors/${status}`,
    title: `HTTP ${status}`,
    status,
    detail: `Error ${status}`,
  };
}

function createClient(maxRetries: number): SignDocsBrasilClient {
  return new SignDocsBrasilClient({
    clientId: 'test-client',
    clientSecret: 'test-secret',
    baseUrl: 'https://api.signdocs.com.br',
    maxRetries,
  });
}

function createMockFetchWithSequence(responses: Response[]): jest.Mock {
  let callIndex = 0;
  return jest.fn().mockImplementation(async (url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    if (urlStr.includes('/oauth2/token')) {
      return jsonResponse(200, TOKEN_RESPONSE);
    }
    const resp = responses[callIndex++];
    return resp;
  });
}

describe('Retry Integration: end-to-end retry loop', () => {
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
  });

  it('503 → 200: retries once and succeeds', async () => {
    const fn = createMockFetchWithSequence([
      jsonResponse(503, errorBody(503)),
      jsonResponse(200, SUCCESS_BODY),
    ]);
    global.fetch = fn;

    const client = createClient(3);
    const promise = client.transactions.get('tx-001');

    // Advance past the retry delay
    await jest.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result.transactionId).toBe('tx-001');
    // 1 token call + 2 API calls (initial + 1 retry)
    const apiCalls = fn.mock.calls.filter((c: any[]) => !c[0].toString().includes('/oauth2/token'));
    expect(apiCalls.length).toBe(2);
  });

  it('429 + Retry-After → 200: respects Retry-After header', async () => {
    const fn = createMockFetchWithSequence([
      jsonResponse(429, errorBody(429), { 'Retry-After': '1' }),
      jsonResponse(200, SUCCESS_BODY),
    ]);
    global.fetch = fn;

    const client = createClient(3);
    const promise = client.transactions.get('tx-001');

    await jest.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result.transactionId).toBe('tx-001');
    const apiCalls = fn.mock.calls.filter((c: any[]) => !c[0].toString().includes('/oauth2/token'));
    expect(apiCalls.length).toBe(2);
  });

  it('503 × 3 → 200 (maxRetries=3): four total requests', async () => {
    const fn = createMockFetchWithSequence([
      jsonResponse(503, errorBody(503)),
      jsonResponse(503, errorBody(503)),
      jsonResponse(503, errorBody(503)),
      jsonResponse(200, SUCCESS_BODY),
    ]);
    global.fetch = fn;

    const client = createClient(3);
    const promise = client.transactions.get('tx-001');

    // Advance past all retry delays
    await jest.advanceTimersByTimeAsync(30000);
    const result = await promise;

    expect(result.transactionId).toBe('tx-001');
    const apiCalls = fn.mock.calls.filter((c: any[]) => !c[0].toString().includes('/oauth2/token'));
    expect(apiCalls.length).toBe(4);
  });

  it('503 × 4 (maxRetries=3): throws after exhausting retries', async () => {
    const fn = createMockFetchWithSequence([
      jsonResponse(503, errorBody(503)),
      jsonResponse(503, errorBody(503)),
      jsonResponse(503, errorBody(503)),
      jsonResponse(503, errorBody(503)),
    ]);
    global.fetch = fn;

    const client = createClient(3);
    const promise = client.transactions.get('tx-001');

    // Advance through all retry delays, catching error along the way
    let caughtError: unknown;
    promise.catch((e) => { caughtError = e; });

    await jest.advanceTimersByTimeAsync(30000);
    // Wait for the promise rejection to be processed
    await jest.advanceTimersByTimeAsync(1);

    await expect(promise).rejects.toThrow(ServiceUnavailableError);
    const apiCalls = fn.mock.calls.filter((c: any[]) => !c[0].toString().includes('/oauth2/token'));
    expect(apiCalls.length).toBe(4);
  });

  it('non-retryable 400: no retry, immediate error', async () => {
    const fn = createMockFetchWithSequence([
      jsonResponse(400, errorBody(400)),
    ]);
    global.fetch = fn;

    const client = createClient(3);

    await expect(
      client.transactions.get('tx-001'),
    ).rejects.toThrow(BadRequestError);

    const apiCalls = fn.mock.calls.filter((c: any[]) => !c[0].toString().includes('/oauth2/token'));
    expect(apiCalls.length).toBe(1);
  });
});
