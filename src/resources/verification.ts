import { HttpClient } from '../http-client';
import { VerificationResponse, VerificationDownloadsResponse } from '../types/evidence';

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
}
