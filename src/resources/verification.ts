import { HttpClient } from '../http-client';
import {
  VerificationResponse,
  VerificationDownloadsResponse,
  EnvelopeVerificationResponse,
  VerifyDocumentRequest,
  VerifyDocumentResponse,
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

  /**
   * Inspect an uploaded PDF for embedded electronic/digital signatures.
   *
   * Unlike the other `verify*` methods on this resource, this is an
   * **authenticated** endpoint: it sends a Bearer JWT and requires the
   * `verification:write` scope. It is also **production-credentials only**
   * — the signature-detection backend is not provisioned in HML, so calls
   * made with sandbox credentials will fail at runtime.
   *
   * @param request The base64-encoded PDF (`content`) and optional `filename`.
   */
  async verifyDocument(
    request: VerifyDocumentRequest,
    options?: { timeout?: number },
  ): Promise<VerifyDocumentResponse> {
    return this.http.request<VerifyDocumentResponse>({
      method: 'POST',
      path: '/v1/verify/document',
      body: request,
      timeout: options?.timeout,
    });
  }
}
