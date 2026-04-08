import * as crypto from 'crypto';

const DEFAULT_TOLERANCE_SECONDS = 300;

export interface WebhookVerifyOptions {
  toleranceSeconds?: number;
}

export function verifyWebhookSignature(
  body: string,
  signatureHeader: string,
  timestampHeader: string,
  secret: string,
  options?: WebhookVerifyOptions,
): boolean {
  const tolerance = options?.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;

  const timestamp = parseInt(timestampHeader, 10);
  if (isNaN(timestamp)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) {
    return false;
  }

  const signingInput = `${timestamp}.${body}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('hex');

  const sigBuf = Buffer.from(signatureHeader);
  const expBuf = Buffer.from(expected);

  if (sigBuf.length !== expBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expBuf);
}
