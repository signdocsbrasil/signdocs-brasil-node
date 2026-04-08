import { HttpClient } from '../http-client';
import {
  RegisterWebhookRequest,
  RegisterWebhookResponse,
  Webhook,
  WebhookTestResponse,
} from '../types/webhook';

export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  async register(request: RegisterWebhookRequest, options?: { timeout?: number }): Promise<RegisterWebhookResponse> {
    return this.http.request<RegisterWebhookResponse>({
      method: 'POST',
      path: '/v1/webhooks',
      body: request,
      timeout: options?.timeout,
    });
  }

  async list(options?: { timeout?: number }): Promise<Webhook[]> {
    return this.http.request<Webhook[]>({
      method: 'GET',
      path: '/v1/webhooks',
      timeout: options?.timeout,
    });
  }

  async delete(webhookId: string, options?: { timeout?: number }): Promise<void> {
    return this.http.request<void>({
      method: 'DELETE',
      path: `/v1/webhooks/${webhookId}`,
      timeout: options?.timeout,
    });
  }

  async test(webhookId: string, options?: { timeout?: number }): Promise<WebhookTestResponse> {
    return this.http.request<WebhookTestResponse>({
      method: 'POST',
      path: `/v1/webhooks/${webhookId}/test`,
      timeout: options?.timeout,
    });
  }
}
