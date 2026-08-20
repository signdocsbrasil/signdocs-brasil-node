import { SigningSessionsResource } from '../../src/resources/signing-sessions';
import { HttpClient } from '../../src/http-client';

function mockHttpClient(): jest.Mocked<HttpClient> {
  return {
    request: jest.fn(),
    requestWithIdempotency: jest.fn(),
  } as unknown as jest.Mocked<HttpClient>;
}

describe('SigningSessionsResource', () => {
  let http: jest.Mocked<HttpClient>;
  let sessions: SigningSessionsResource;

  beforeEach(() => {
    http = mockHttpClient();
    sessions = new SigningSessionsResource(http);
  });

  it('create() POSTs with idempotency key', async () => {
    http.requestWithIdempotency.mockResolvedValue({ id: 'ss_1' } as any);
    await sessions.create({ signerName: 'A' } as any, 'idem-1');
    expect(http.requestWithIdempotency).toHaveBeenCalledWith(
      { method: 'POST', path: '/v1/signing-sessions', body: { signerName: 'A' }, timeout: undefined },
      'idem-1',
    );
  });

  it('getStatus() GETs the status path', async () => {
    http.request.mockResolvedValue({ status: 'ACTIVE' } as any);
    await sessions.getStatus('ss_1');
    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/v1/signing-sessions/ss_1/status',
      timeout: undefined,
    });
  });

  it('cancel() POSTs the cancel path', async () => {
    http.request.mockResolvedValue({} as any);
    await sessions.cancel('ss_1');
    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/signing-sessions/ss_1/cancel',
      timeout: undefined,
    });
  });

  it('link() POSTs the link path with no body', async () => {
    const minted = {
      sessionId: 'ss_1',
      transactionId: 'tx_1',
      url: 'https://sign.signdocs.com.br/s/ss_1?cs=abc',
      expiresAt: '2026-08-27T12:00:00.000Z',
      expiresIn: 3600,
    };
    http.request.mockResolvedValue(minted as any);

    const result = await sessions.link('ss_1');

    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/signing-sessions/ss_1/link',
      timeout: undefined,
    });
    // No body: the endpoint takes none, and sending one would be silently
    // ignored rather than rejected.
    expect(http.request.mock.calls[0][0]).not.toHaveProperty('body');
    // Minting a link is not a metered create — it must not carry a key, or a
    // retry would replay a consumed single-use URL instead of issuing a new one.
    expect(http.requestWithIdempotency).not.toHaveBeenCalled();
    expect(result.url).toBe(minted.url);
    expect(result.expiresIn).toBe(3600);
  });

  it('list() with status only sends just the status query', async () => {
    http.request.mockResolvedValue({ items: [] } as any);
    await sessions.list({ status: 'ACTIVE' } as any);
    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/v1/signing-sessions',
      query: { status: 'ACTIVE' },
      timeout: undefined,
    });
  });

  it('list() includes limit and cursor when provided', async () => {
    http.request.mockResolvedValue({ items: [] } as any);
    await sessions.list({ status: 'COMPLETED', limit: 10, cursor: 'abc' } as any);
    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/v1/signing-sessions',
      query: { status: 'COMPLETED', limit: '10', cursor: 'abc' },
      timeout: undefined,
    });
  });

  it('get() GETs the bootstrap path', async () => {
    http.request.mockResolvedValue({ id: 'ss_1' } as any);
    await sessions.get('ss_1');
    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/v1/signing-sessions/ss_1',
      timeout: undefined,
    });
  });

  it('advance() POSTs the action body', async () => {
    http.request.mockResolvedValue({} as any);
    await sessions.advance('ss_1', { action: 'accept' } as any);
    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/signing-sessions/ss_1/advance',
      body: { action: 'accept' },
      timeout: undefined,
    });
  });

  it('resendOtp() with a channel sends the channel in the body', async () => {
    http.request.mockResolvedValue({} as any);
    await sessions.resendOtp('ss_1', { channel: 'sms' });
    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/signing-sessions/ss_1/resend-otp',
      body: { channel: 'sms' },
      timeout: undefined,
    });
  });

  it('resendOtp() without args sends no body', async () => {
    http.request.mockResolvedValue({} as any);
    await sessions.resendOtp('ss_1');
    expect(http.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v1/signing-sessions/ss_1/resend-otp',
      body: undefined,
      timeout: undefined,
    });
  });
});
