import { HttpClient } from '../http-client';
import {
  CreateEnvelopeRequest,
  Envelope,
  EnvelopeDetail,
  AddEnvelopeSessionRequest,
  EnvelopeSession,
  EnvelopeCombinedStampResponse,
  CancelEnvelopeResponse,
} from '../types/envelope';

export class EnvelopesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new envelope for multi-signer document signing.
   * Returns the envelope with its ID and status.
   */
  async create(
    request: CreateEnvelopeRequest,
    idempotencyKey?: string,
    options?: { timeout?: number },
  ): Promise<Envelope> {
    return this.http.requestWithIdempotency<Envelope>(
      { method: 'POST', path: '/v1/envelopes', body: request, timeout: options?.timeout },
      idempotencyKey,
    );
  }

  /**
   * Get envelope details including session summaries.
   */
  async get(
    envelopeId: string,
    options?: { timeout?: number },
  ): Promise<EnvelopeDetail> {
    return this.http.request<EnvelopeDetail>({
      method: 'GET',
      path: `/v1/envelopes/${envelopeId}`,
      timeout: options?.timeout,
    });
  }

  /**
   * Add a signing session to an envelope for a specific signer.
   * Returns the session URL and clientSecret for widget/redirect integration.
   */
  async addSession(
    envelopeId: string,
    request: AddEnvelopeSessionRequest,
    options?: { timeout?: number },
  ): Promise<EnvelopeSession> {
    return this.http.request<EnvelopeSession>({
      method: 'POST',
      path: `/v1/envelopes/${envelopeId}/sessions`,
      body: request,
      timeout: options?.timeout,
    });
  }

  /**
   * Cancel an entire envelope.
   *
   * Transitions every non-terminal session and its transaction to CANCELLED and
   * marks the envelope CANCELLED, killing the pending signing links. Signatures
   * already collected are preserved and reported as `preservedSignedCount`.
   *
   * Prefer this over cancelling each session individually: it is one call, it
   * records the cancellation as a single auditable terminal event, and it is
   * the only way to move the envelope's own status. Cancelling the member
   * sessions one by one leaves the envelope itself ACTIVE.
   *
   * Idempotent: re-cancelling returns `cancelledCount` 0 and
   * `alreadyCancelled` true.
   *
   * @param reason Free-text reason recorded in the audit trail. Defaults
   *               server-side to `envelope_cancelled`.
   */
  async cancel(
    envelopeId: string,
    reason?: string,
    options?: { timeout?: number },
  ): Promise<CancelEnvelopeResponse> {
    return this.http.request<CancelEnvelopeResponse>({
      method: 'POST',
      path: `/v1/envelopes/${envelopeId}/cancel`,
      body: reason ? { reason } : {},
      timeout: options?.timeout,
    });
  }

  /**
   * Generate a combined stamped PDF with all signer evidence.
   * Only available when the envelope status is COMPLETED.
   */
  async combinedStamp(
    envelopeId: string,
    options?: { timeout?: number },
  ): Promise<EnvelopeCombinedStampResponse> {
    return this.http.request<EnvelopeCombinedStampResponse>({
      method: 'POST',
      path: `/v1/envelopes/${envelopeId}/combined-stamp`,
      timeout: options?.timeout,
    });
  }
}
