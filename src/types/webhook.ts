export type WebhookEventType =
  | 'TRANSACTION.CREATED'
  | 'TRANSACTION.COMPLETED'
  | 'TRANSACTION.CANCELLED'
  | 'TRANSACTION.FAILED'
  | 'TRANSACTION.EXPIRED'
  | 'TRANSACTION.FALLBACK'
  | 'STEP.STARTED'
  | 'STEP.COMPLETED'
  | 'STEP.FAILED'
  | 'QUOTA.WARNING'
  | 'API.DEPRECATION_NOTICE';

export interface RegisterWebhookRequest {
  url: string;
  events: WebhookEventType[];
}

export interface RegisterWebhookResponse {
  webhookId: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  status: 'ACTIVE';
  createdAt: string;
}

export interface Webhook {
  webhookId: string;
  url: string;
  events: WebhookEventType[];
  status: string;
  createdAt: string;
}

export interface WebhookPayload {
  id: string;
  eventType: WebhookEventType;
  tenantId: string;
  transactionId?: string;
  timestamp: string;
  data: Record<string, unknown>;
  test?: boolean;
}

export interface WebhookTestResponse {
  deliveryId: string;
  status: string;
  statusCode?: number;
}
