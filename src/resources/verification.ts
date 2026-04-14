import { HttpClient } from '../http-client';
import {
  VerificationResponse,
  VerificationDownloadsResponse,
  EnvelopeVerificationResponse,
} from '../types/evidence';

export class VerificationResource {
  constructor(private readonly http: HttpClient) {}

  async verify(evidenceId: string, options?: { timeout?: number }): Promise<VerificationResponse> {
    return this.http.request<VerificationResponse>({
      method: 'GET',
      path: `/v1/verify/${evidenceId}`,
      noAuth: true,
      timeout: options?.timeout,
    });
  }

  async downloads(evidenceId: string, options?: { timeout?: number }): Promise<VerificationDownloadsResponse> {
    return this.http.request<VerificationDownloadsResponse>({
      method: 'GET',
      path: `/v1/verify/${evidenceId}/downloads`,
      noAuth: true,
      timeout: options?.timeout,
    });
  }

  /**
   * Verify a multi-signer envelope by its ID.
   *
   * Returns the envelope status, signers list (each with an `evidenceId`
   * for drill-down), and consolidated download URLs. For non-PDF envelopes
   * signed with digital certificates, the consolidated `.p7s` containing
   * every signer's `SignerInfo` is exposed via
   * `downloads.consolidatedSignature`.
   *
   * Public endpoint — no authentication required.
   */
  async verifyEnvelope(envelopeId: string, options?: { timeout?: number }): Promise<EnvelopeVerificationResponse> {
    return this.http.request<EnvelopeVerificationResponse>({
      method: 'GET',
      path: `/v1/verify/envelope/${envelopeId}`,
      noAuth: true,
      timeout: options?.timeout,
    });
  }
}
