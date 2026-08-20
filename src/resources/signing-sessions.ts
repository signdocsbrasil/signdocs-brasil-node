import { HttpClient } from '../http-client';
import {
  AdvanceSessionRequest,
  AdvanceSessionResponse,
  CreateSigningSessionRequest,
  SigningSession,
  SigningSessionBootstrap,
  SigningSessionStatus,
  CancelSigningSessionResponse,
  SigningSessionListParams,
  SigningSessionListResponse,
  ResendOtpRequest,
  MintSigningLinkResponse,
} from '../types/signing-session';

export class SigningSessionsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new signing session.
   * Returns the session URL and clientSecret for widget/redirect integration.
   */
  async create(
    request: CreateSigningSessionRequest,
    idempotencyKey?: string,
    options?: { timeout?: number },
  ): Promise<SigningSession> {
    return this.http.requestWithIdempotency<SigningSession>(
      { method: 'POST', path: '/v1/signing-sessions', body: request, timeout: options?.timeout },
      idempotencyKey,
    );
  }

  /**
   * Get the current status of a signing session.
   * Use this for integrator-side polling (OAuth2 auth).
   */
  async getStatus(
    sessionId: string,
    options?: { timeout?: number },
  ): Promise<SigningSessionStatus> {
    return this.http.request<SigningSessionStatus>({
      method: 'GET',
      path: `/v1/signing-sessions/${sessionId}/status`,
      timeout: options?.timeout,
    });
  }

  /**
   * Cancel an active signing session.
   */
  async cancel(
    sessionId: string,
    options?: { timeout?: number },
  ): Promise<CancelSigningSessionResponse> {
    return this.http.request<CancelSigningSessionResponse>({
      method: 'POST',
      path: `/v1/signing-sessions/${sessionId}/cancel`,
      timeout: options?.timeout,
    });
  }

  /**
   * Mint a fresh signing URL for an existing session and return it, instead of
   * e-mailing it.
   *
   * A signing link is **single-use**: once the signer finishes — or the embed
   * token is otherwise consumed — reopening the same URL returns
   * `401 Embed token has been consumed`. This issues a new one without creating
   * another transaction and **without consuming quota**. Works for standalone
   * and envelope sessions alike.
   *
   * The session must be `ACTIVE`; a completed or cancelled one returns 409,
   * since a link to a finished session would authenticate nothing. To give
   * access to the signed document use `envelopes.combinedStamp()` or
   * `transactions.download()` instead.
   *
   * `expiresAt` is inherited from the original session and is not extended.
   *
   * **Authorises the tenant, not the end user.** The API cannot tell which of
   * your users is entitled to this link, so an application whose users share
   * one tenant must establish that itself before calling — otherwise this
   * becomes a way for one user to obtain another's signing credential.
   */
  async link(
    sessionId: string,
    options?: { timeout?: number },
  ): Promise<MintSigningLinkResponse> {
    return this.http.request<MintSigningLinkResponse>({
      method: 'POST',
      path: `/v1/signing-sessions/${sessionId}/link`,
      timeout: options?.timeout,
    });
  }

  /**
   * List signing sessions filtered by status.
   */
  async list(
    params: SigningSessionListParams,
    options?: { timeout?: number },
  ): Promise<SigningSessionListResponse> {
    const query: Record<string, string> = { status: params.status };
    if (params.limit !== undefined) query.limit = String(params.limit);
    if (params.cursor) query.cursor = params.cursor;

    return this.http.request<SigningSessionListResponse>({
      method: 'GET',
      path: '/v1/signing-sessions',
      query,
      timeout: options?.timeout,
    });
  }

  /**
   * Get full bootstrap data for a signing session.
   * Used by the embedded signing widget to initialize the UI.
   */
  async get(
    sessionId: string,
    options?: { timeout?: number },
  ): Promise<SigningSessionBootstrap> {
    return this.http.request<SigningSessionBootstrap>({
      method: 'GET',
      path: `/v1/signing-sessions/${sessionId}`,
      timeout: options?.timeout,
    });
  }

  /**
   * Advance a signing session through its steps.
   * Supports actions: accept, verify_otp, resend_otp, start_liveness,
   * complete_liveness, prepare_signing, complete_signing.
   */
  async advance(
    sessionId: string,
    request: AdvanceSessionRequest,
    options?: { timeout?: number },
  ): Promise<AdvanceSessionResponse> {
    return this.http.request<AdvanceSessionResponse>({
      method: 'POST',
      path: `/v1/signing-sessions/${sessionId}/advance`,
      body: request,
      timeout: options?.timeout,
    });
  }

  /**
   * Resend the OTP challenge for a signing session.
   * Optionally specify a delivery channel ('email' or 'sms').
   */
  async resendOtp(
    sessionId: string,
    request?: ResendOtpRequest,
    options?: { timeout?: number },
  ): Promise<AdvanceSessionResponse> {
    return this.http.request<AdvanceSessionResponse>({
      method: 'POST',
      path: `/v1/signing-sessions/${sessionId}/resend-otp`,
      body: request?.channel ? { channel: request.channel } : undefined,
      timeout: options?.timeout,
    });
  }

  /**
   * Poll until the session reaches a terminal state (COMPLETED, CANCELLED, EXPIRED, FAILED).
   * Resolves with the final status.
   */
  async waitForCompletion(
    sessionId: string,
    options?: { pollIntervalMs?: number; timeoutMs?: number },
  ): Promise<SigningSessionStatus> {
    const interval = options?.pollIntervalMs ?? 3000;
    const timeout = options?.timeoutMs ?? 300_000; // 5 min default
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.getStatus(sessionId);
      if (status.status !== 'ACTIVE') {
        return status;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Signing session ${sessionId} did not complete within ${timeout}ms`);
  }
}
