import { HttpClient } from '../http-client';
import {
  CreateEnvelopeRequest,
  Envelope,
  EnvelopeDetail,
  AddEnvelopeSessionRequest,
  EnvelopeSession,
  EnvelopeCombinedStampResponse,
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
