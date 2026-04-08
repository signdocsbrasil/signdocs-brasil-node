import { HttpClient } from '../http-client';
import { HealthCheckResponse, HealthHistoryResponse } from '../types/health';

export class HealthResource {
  constructor(private readonly http: HttpClient) {}

  async check(options?: { timeout?: number }): Promise<HealthCheckResponse> {
    return this.http.request<HealthCheckResponse>({
      method: 'GET',
      path: '/health',
      noAuth: true,
      timeout: options?.timeout,
    });
  }

  async history(options?: { timeout?: number }): Promise<HealthHistoryResponse> {
    return this.http.request<HealthHistoryResponse>({
      method: 'GET',
      path: '/health/history',
      noAuth: true,
      timeout: options?.timeout,
    });
  }
}
