import * as crypto from 'crypto';
import { verifyWebhookSignature } from '../src/webhook-verifier';

describe('verifyWebhookSignature', () => {
  const secret = 'whsec_test_secret_key_12345';
  const body = '{"id":"dlv-001","eventType":"TRANSACTION.COMPLETED"}';

  function sign(ts: string, payload: string, sec: string): string {
    return crypto.createHmac('sha256', sec).update(`${ts}.${payload}`).digest('hex');
  }

  it('should return true for a valid signature', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = sign(timestamp, body, secret);
    expect(verifyWebhookSignature(body, signature, timestamp, secret)).toBe(true);
  });

  it('should return false for an invalid signature', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    expect(verifyWebhookSignature(body, 'invalidsig', timestamp, secret)).toBe(false);
  });

  it('should return false for an expired timestamp', () => {
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
    const signature = sign(oldTimestamp, body, secret);
    expect(verifyWebhookSignature(body, signature, oldTimestamp, secret)).toBe(false);
  });

  it('should return false for a future timestamp beyond tolerance', () => {
    const futureTimestamp = (Math.floor(Date.now() / 1000) + 600).toString();
    const signature = sign(futureTimestamp, body, secret);
    expect(verifyWebhookSignature(body, signature, futureTimestamp, secret)).toBe(false);
  });

  it('should accept custom tolerance', () => {
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString();
    const signature = sign(oldTimestamp, body, secret);
    expect(verifyWebhookSignature(body, signature, oldTimestamp, secret, { toleranceSeconds: 500 })).toBe(true);
    expect(verifyWebhookSignature(body, signature, oldTimestamp, secret, { toleranceSeconds: 300 })).toBe(false);
  });

  it('should return false for non-numeric timestamp', () => {
    const signature = sign('notanumber', body, secret);
    expect(verifyWebhookSignature(body, signature, 'notanumber', secret)).toBe(false);
  });

  it('should return false for wrong secret', () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = sign(timestamp, body, 'wrong_secret');
    expect(verifyWebhookSignature(body, signature, timestamp, secret)).toBe(false);
  });
});
