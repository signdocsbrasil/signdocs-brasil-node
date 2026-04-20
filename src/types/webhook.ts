export type WebhookEventType =
  | 'TRANSACTION.CREATED'
  | 'TRANSACTION.COMPLETED'
  | 'TRANSACTION.CANCELLED'
  | 'TRANSACTION.FAILED'
  | 'TRANSACTION.EXPIRED'
  | 'TRANSACTION.FALLBACK'
  | 'TRANSACTION.DEADLINE_APPROACHING'
  | 'STEP.STARTED'
  | 'STEP.COMPLETED'
  | 'STEP.FAILED'
  | 'STEP.PURPOSE_DISCLOSURE_SENT'
  | 'QUOTA.WARNING'
  | 'API.DEPRECATION_NOTICE'
  | 'SIGNING_SESSION.CREATED'
  | 'SIGNING_SESSION.COMPLETED'
  | 'SIGNING_SESSION.CANCELLED'
  | 'SIGNING_SESSION.EXPIRED';

/**
 * Canonical set of all 17 spec webhook event types. Kept in lockstep
 * with the OpenAPI spec `WebhookEventType` enum at
 * `openapi/openapi.yaml`.
 */
export const WEBHOOK_EVENT_TYPES: readonly WebhookEventType[] = [
  'TRANSACTION.CREATED',
  'TRANSACTION.COMPLETED',
  'TRANSACTION.CANCELLED',
  'TRANSACTION.FAILED',
  'TRANSACTION.EXPIRED',
  'TRANSACTION.FALLBACK',
  'TRANSACTION.DEADLINE_APPROACHING',
  'STEP.STARTED',
  'STEP.COMPLETED',
  'STEP.FAILED',
  'STEP.PURPOSE_DISCLOSURE_SENT',
  'QUOTA.WARNING',
  'API.DEPRECATION_NOTICE',
  'SIGNING_SESSION.CREATED',
  'SIGNING_SESSION.COMPLETED',
  'SIGNING_SESSION.CANCELLED',
  'SIGNING_SESSION.EXPIRED',
] as const;

/**
 * Webhook events tagged NT65 are emitted only for tenants with
 * `nt65ComplianceEnabled` (INSS consignado workflow).
 */
export const NT65_WEBHOOK_EVENTS: ReadonlySet<WebhookEventType> = new Set<WebhookEventType>([
  'TRANSACTION.DEADLINE_APPROACHING',
  'STEP.PURPOSE_DISCLOSURE_SENT',
]);

/**
 * True if the given event is part of the NT65 INSS consignado flow
 * and only emitted for tenants with `nt65ComplianceEnabled`.
 */
export function isNt65Event(event: WebhookEventType): boolean {
  return NT65_WEBHOOK_EVENTS.has(event);
}

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
