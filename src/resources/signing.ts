import { HttpClient } from '../http-client';
import {
  PrepareSigningRequest,
  PrepareSigningResponse,
  CompleteSigningRequest,
  CompleteSigningResponse,
} from '../types/signing';

export class SigningResource {
  constructor(private readonly http: HttpClient) {}

  async prepare(transactionId: string, request: PrepareSigningRequest, options?: { timeout?: number }): Promise<PrepareSigningResponse> {
    return this.http.request<PrepareSigningResponse>({
      method: 'POST',
      path: `/v1/transactions/${transactionId}/signing/prepare`,
      body: request,
      timeout: options?.timeout,
    });
  }

  async complete(transactionId: string, request: CompleteSigningRequest, options?: { timeout?: number }): Promise<CompleteSigningResponse> {
    return this.http.request<CompleteSigningResponse>({
      method: 'POST',
      path: `/v1/transactions/${transactionId}/signing/complete`,
      body: request,
      timeout: options?.timeout,
    });
  }
}
