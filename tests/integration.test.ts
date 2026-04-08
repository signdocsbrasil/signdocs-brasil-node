import { SignDocsBrasilClient } from '../src/client';
import {
  BadRequestError,
  NotFoundError,
  RateLimitError,
  ConflictError,
} from '../src/errors';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

function loadFixture(name: string): any {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), 'utf-8'));
}

const TOKEN_RESPONSE = {
  access_token: 'test-integration-token',
  token_type: 'Bearer',
  expires_in: 900,
  scope: 'transactions:read transactions:write',
};

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

function createMockFetch(
  apiStatus: number,
  apiBody: unknown,
  apiHeaders: Record<string, string> = {},
): jest.Mock {
  const fn = jest.fn().mockImplementation(async (url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url.toString();

    if (urlStr.includes('/oauth2/token')) {
      return new Response(JSON.stringify(TOKEN_RESPONSE), {
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
    }

    const h = new Headers({ 'Content-Type': 'application/json', ...apiHeaders });
    return new Response(JSON.stringify(apiBody), { status: apiStatus, headers: h });
  });
  return fn;
}

function createClient(): SignDocsBrasilClient {
  return new SignDocsBrasilClient({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    baseUrl: 'https://api.signdocs.com.br',
    maxRetries: 0,
  });
}

describe('Integration: Full Stack (Config → Client → Auth → Http → Resource)', () => {
  describe('Happy paths', () => {
    it('transactions.create() → deserializes Transaction with nested objects', async () => {
      const fixture = loadFixture('transactions-create');
      const fn = createMockFetch(fixture.response.status, fixture.response.body, fixture.response.headers);
      global.fetch = fn;

      const client = createClient();
      const result = await client.transactions.create(fixture.input);

      // Verify deserialized model fields
      expect(result.tenantId).toBe('abc123');
      expect(result.transactionId).toBe('tx-uuid-001');
      expect(result.status).toBe('CREATED');
      expect(result.purpose).toBe('DOCUMENT_SIGNATURE');
      expect(result.policy.profile).toBe('CLICK_ONLY');
      expect(result.signer.name).toBe('João Silva');
      expect(result.signer.email).toBe('joao@example.com');
      expect(result.signer.cpf).toBe('12345678901');
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].stepId).toBe('step-uuid-001');
      expect(result.steps[0].type).toBe('CLICK_ACCEPT');
      expect(result.steps[0].status).toBe('PENDING');
      expect(result.metadata).toEqual({ contractId: 'CTR-2024-001' });

      // Verify request: POST, correct path, auth header, idempotency key, body
      const apiCall = fn.mock.calls.find((c: any[]) => !c[0].toString().includes('/oauth2/token'));
      expect(apiCall).toBeDefined();
      const [reqUrl, reqInit] = apiCall!;
      expect(reqInit.method).toBe('POST');
      expect(reqUrl.toString()).toContain('/v1/transactions');
      expect(reqInit.headers['Authorization']).toBe('Bearer test-integration-token');
      expect(reqInit.headers['X-Idempotency-Key']).toBeDefined();
      expect(reqInit.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(reqInit.body)).toEqual(fixture.input);
    });

    it('transactions.list() → deserializes TransactionListResponse with pagination', async () => {
      const fixture = loadFixture('transactions-list');
      const fn = createMockFetch(fixture.response.status, fixture.response.body);
      global.fetch = fn;

      const client = createClient();
      const result = await client.transactions.list({ status: 'COMPLETED', limit: 2 } as any);

      expect(result.transactions).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.nextToken).toBeDefined();
      expect(result.transactions[0].transactionId).toBe('tx-uuid-002');
      expect(result.transactions[0].signer.name).toBe('Maria Santos');
      expect(result.transactions[1].policy.profile).toBe('BIOMETRIC');
    });

    it('transactions.get() → deserializes single Transaction with completed steps', async () => {
      const fixture = loadFixture('transactions-get');
      const fn = createMockFetch(fixture.response.status, fixture.response.body);
      global.fetch = fn;

      const client = createClient();
      const result = await client.transactions.get('tx-uuid-001');

      expect(result.status).toBe('IN_PROGRESS');
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].status).toBe('COMPLETED');
      expect(result.steps[0].result?.click?.accepted).toBe(true);
      expect(result.steps[1].type).toBe('OTP_CHALLENGE');
      expect(result.steps[1].status).toBe('PENDING');

      // Verify request path
      const apiCall = fn.mock.calls.find((c: any[]) => !c[0].toString().includes('/oauth2/token'));
      expect(apiCall![0].toString()).toContain('/v1/transactions/tx-uuid-001');
    });

    it('documents.upload() → verifies request body and deserializes response', async () => {
      const fixture = loadFixture('documents-upload');
      const fn = createMockFetch(fixture.response.status, fixture.response.body);
      global.fetch = fn;

      const client = createClient();
      const result = await client.documents.upload('tx-uuid-001', {
        content: fixture.input.content,
        filename: fixture.input.filename,
      });

      expect(result.status).toBe('DOCUMENT_UPLOADED');
      expect(result.transactionId).toBe('tx-uuid-001');
      expect(result.documentHash).toBe('sha256-abc123def456');

      const apiCall = fn.mock.calls.find((c: any[]) => !c[0].toString().includes('/oauth2/token'));
      expect(apiCall![0].toString()).toContain('/v1/transactions/tx-uuid-001/document');
      const sentBody = JSON.parse(apiCall![1].body);
      expect(sentBody.content).toBe(fixture.input.content);
      expect(sentBody.filename).toBe('contract.pdf');
    });

    it('webhooks.register() → verifies request and deserializes RegisterWebhookResponse', async () => {
      const fixture = loadFixture('webhooks-register');
      const fn = createMockFetch(fixture.response.status, fixture.response.body);
      global.fetch = fn;

      const client = createClient();
      const result = await client.webhooks.register(fixture.input);

      expect(result.webhookId).toBe('wh-uuid-001');
      expect(result.url).toBe('https://example.com/webhooks/signdocs');
      expect(result.secret).toBe('whsec_generated_secret_abc123');
      expect(result.events).toEqual(['TRANSACTION.COMPLETED', 'TRANSACTION.FAILED']);
      expect(result.status).toBe('ACTIVE');

      const apiCall = fn.mock.calls.find((c: any[]) => !c[0].toString().includes('/oauth2/token'));
      const sentBody = JSON.parse(apiCall![1].body);
      expect(sentBody.url).toBe(fixture.input.url);
      expect(sentBody.events).toEqual(fixture.input.events);
    });

    it('health.check() → no Authorization header, deserializes health response', async () => {
      const fixture = loadFixture('health-check');
      const fn = createMockFetch(fixture.response.status, fixture.response.body);
      global.fetch = fn;

      const client = createClient();
      const result = await client.health.check();

      expect(result.status).toBe('healthy');
      expect(result.version).toBe('1.0.0');
      expect(result.services!.dynamodb.status).toBe('healthy');

      // Health check should NOT include Authorization header and should NOT call token endpoint
      const apiCalls = fn.mock.calls.filter((c: any[]) => !c[0].toString().includes('/oauth2/token'));
      expect(apiCalls).toHaveLength(1);
      expect(apiCalls[0][1].headers['Authorization']).toBeUndefined();
    });

    it('verification.verify() → no Authorization header, deserializes verification response', async () => {
      const fixture = loadFixture('verification-verify');
      const fn = createMockFetch(fixture.response.status, fixture.response.body);
      global.fetch = fn;

      const client = createClient();
      const result = await client.verification.verify('ev-uuid-001');

      expect(result.status).toBe('COMPLETED');
      expect(result.evidenceId).toBe('ev-uuid-001');
      expect(result.transactionId).toBe('tx-uuid-001');

      const apiCalls = fn.mock.calls.filter((c: any[]) => !c[0].toString().includes('/oauth2/token'));
      expect(apiCalls).toHaveLength(1);
      expect(apiCalls[0][1].headers['Authorization']).toBeUndefined();
      expect(apiCalls[0][0].toString()).toContain('/v1/verify/ev-uuid-001');
    });
  });

  describe('Error paths', () => {
    it('transactions.create() with 400 → throws BadRequestError with ProblemDetail fields', async () => {
      const fixture = loadFixture('error-400');
      const fn = createMockFetch(
        fixture.response.status,
        fixture.response.body,
        fixture.response.headers,
      );
      global.fetch = fn;

      const client = createClient();
      try {
        await client.transactions.create({
          purpose: 'DOCUMENT_SIGNATURE',
          policy: { profile: 'UNKNOWN_PROFILE' as any },
          signer: { name: 'Test', userExternalId: 'u1' },
        });
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestError);
        const err = e as BadRequestError;
        expect(err.status).toBe(400);
        expect(err.type).toBe(fixture.expected_error.type);
        expect(err.title).toBe(fixture.expected_error.title);
        expect(err.detail).toBe(fixture.expected_error.detail);
        expect(err.instance).toBe('/v1/transactions');
      }
    });

    it('transactions.get() with 404 → throws NotFoundError', async () => {
      const fixture = loadFixture('error-404');
      const fn = createMockFetch(
        fixture.response.status,
        fixture.response.body,
        fixture.response.headers,
      );
      global.fetch = fn;

      const client = createClient();
      await expect(
        client.transactions.get('tx-nonexistent'),
      ).rejects.toThrow(NotFoundError);
    });

    it('transactions.create() with 429 → throws RateLimitError with retryAfterSeconds=5', async () => {
      const fixture = loadFixture('error-429');
      const fn = createMockFetch(
        fixture.response.status,
        fixture.response.body,
        fixture.response.headers,
      );
      global.fetch = fn;

      const client = createClient();
      try {
        await client.transactions.create({
          purpose: 'DOCUMENT_SIGNATURE',
          policy: { profile: 'CLICK_ONLY' },
          signer: { name: 'Test', userExternalId: 'u1' },
        });
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(RateLimitError);
        expect((e as RateLimitError).retryAfterSeconds).toBe(5);
        expect((e as RateLimitError).status).toBe(429);
      }
    });

    it('transactions.create() with 409 → throws ConflictError', async () => {
      const fixture = loadFixture('error-409');
      const fn = createMockFetch(
        fixture.response.status,
        fixture.response.body,
        fixture.response.headers,
      );
      global.fetch = fn;

      const client = createClient();
      await expect(
        client.transactions.create({
          purpose: 'DOCUMENT_SIGNATURE',
          policy: { profile: 'CLICK_ONLY' },
          signer: { name: 'Test', userExternalId: 'u1' },
        }),
      ).rejects.toThrow(ConflictError);
    });
  });
});
