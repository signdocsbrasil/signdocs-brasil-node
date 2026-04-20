import {
  WebhookEventType,
  WEBHOOK_EVENT_TYPES,
  NT65_WEBHOOK_EVENTS,
  isNt65Event,
} from '../src/types/webhook';

/**
 * Lockstep with the OpenAPI spec `WebhookEventType` enum. If this
 * array diverges from `openapi/openapi.yaml`, one side is wrong.
 */
const SPEC_EVENTS: readonly string[] = [
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
];

describe('WebhookEventType', () => {
  it('covers all spec events', () => {
    for (const event of SPEC_EVENTS) {
      expect(WEBHOOK_EVENT_TYPES).toContain(event as WebhookEventType);
    }
  });

  it('does not include events that are not in the spec', () => {
    for (const event of WEBHOOK_EVENT_TYPES) {
      expect(SPEC_EVENTS).toContain(event);
    }
  });

  it('has the same count as the spec', () => {
    expect(WEBHOOK_EVENT_TYPES.length).toBe(SPEC_EVENTS.length);
    expect(WEBHOOK_EVENT_TYPES.length).toBe(17);
  });

  it('flags NT65 INSS consignado events', () => {
    expect(isNt65Event('TRANSACTION.DEADLINE_APPROACHING')).toBe(true);
    expect(isNt65Event('STEP.PURPOSE_DISCLOSURE_SENT')).toBe(true);

    expect(isNt65Event('TRANSACTION.COMPLETED')).toBe(false);
    expect(isNt65Event('STEP.COMPLETED')).toBe(false);
    expect(isNt65Event('QUOTA.WARNING')).toBe(false);
  });

  it('exposes NT65 events as a readonly set of the same two members', () => {
    expect(NT65_WEBHOOK_EVENTS.size).toBe(2);
    expect(NT65_WEBHOOK_EVENTS.has('TRANSACTION.DEADLINE_APPROACHING')).toBe(true);
    expect(NT65_WEBHOOK_EVENTS.has('STEP.PURPOSE_DISCLOSURE_SENT')).toBe(true);
  });
});
