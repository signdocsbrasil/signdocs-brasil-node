import { EnvelopesResource } from '../../src/resources/envelopes';
import { HttpClient } from '../../src/http-client';

function mockHttpClient(): jest.Mocked<HttpClient> {
  return {
    request: jest.fn(),
    requestWithIdempotency: jest.fn(),
  } as unknown as jest.Mocked<HttpClient>;
}

describe('EnvelopesResource.cancel', () => {
  let http: jest.Mocked<HttpClient>;
  let envelopes: EnvelopesResource;

  beforeEach(() => {
    http = mockHttpClient();
    envelopes = new EnvelopesResource(http);
  });

  it('posts to the envelope cancel endpoint', async () => {
    // Must hit the envelope's own route — cancelling the member sessions one by
    // one leaves the envelope itself ACTIVE.
    http.request.mockResolvedValue({
      envelopeId: 'env_1',
      status: 'CANCELLED',
      cancelledCount: 2,
      preservedSignedCount: 1,
      cancelledSessions: [],
    });

    const result = await envelopes.cancel('env_1', 'owner_cancelled');

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/envelopes/env_1/cancel',
      body: { reason: 'owner_cancelled' },
      timeout: undefined,
    });
    expect(result.cancelledCount).toBe(2);
    // A signature already collected is never invalidated by cancelling.
    expect(result.preservedSignedCount).toBe(1);
  });

  it('sends an empty body when no reason is given', async () => {
    http.request.mockResolvedValue({ envelopeId: 'env_1', status: 'CANCELLED' });

    await envelopes.cancel('env_1');

    expect(http.request).toHaveBeenCalledWith(
      expect.objectContaining({ body: {} }),
    );
  });

  it('surfaces the idempotent re-cancel', async () => {
    http.request.mockResolvedValue({
      envelopeId: 'env_1',
      status: 'CANCELLED',
      cancelledCount: 0,
      alreadyCancelled: true,
    });

    const result = await envelopes.cancel('env_1');

    expect(result.alreadyCancelled).toBe(true);
    expect(result.cancelledCount).toBe(0);
  });
});

describe('EnvelopesResource.addSession', () => {
  let http: jest.Mocked<HttpClient>;
  let envelopes: EnvelopesResource;

  beforeEach(() => {
    http = mockHttpClient();
    envelopes = new EnvelopesResource(http);
  });

  it('sends an idempotency key', async () => {
    // The client retries 500/503 on its own, and this response carries the only
    // copy of clientSecret — so an unkeyed retry loses the credential and is
    // billed for the signer twice.
    http.requestWithIdempotency.mockResolvedValue({ sessionId: 'sess_1' } as any);

    await envelopes.addSession('env_1', { signerIndex: 1 } as any, 'idem-signer-1');

    expect(http.requestWithIdempotency).toHaveBeenCalledWith(
      {
        method: 'POST',
        path: '/v1/envelopes/env_1/sessions',
        body: { signerIndex: 1 },
        timeout: undefined,
      },
      'idem-signer-1',
    );
  });

  it('lets the client mint the key when the caller omits one', async () => {
    http.requestWithIdempotency.mockResolvedValue({ sessionId: 'sess_1' } as any);

    await envelopes.addSession('env_1', { signerIndex: 1 } as any);

    expect(http.requestWithIdempotency).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/v1/envelopes/env_1/sessions' }),
      undefined,
    );
  });
});
