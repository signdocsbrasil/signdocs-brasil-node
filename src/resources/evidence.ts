import { HttpClient } from '../http-client';
import { Evidence } from '../types/evidence';

export class EvidenceResource {
  constructor(private readonly http: HttpClient) {}

  async get(transactionId: string, options?: { timeout?: number }): Promise<Evidence> {
    return this.http.request<Evidence>({
      method: 'GET',
      path: `/v1/transactions/${transactionId}/evidence`,
      timeout: options?.timeout,
    });
  }
}
