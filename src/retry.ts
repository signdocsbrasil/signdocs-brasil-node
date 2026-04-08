import { RateLimitError, TimeoutError, parseApiError } from './errors';

const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);
const MAX_TOTAL_DURATION = 60_000;
const MAX_DELAY = 30_000;

export interface RetryConfig {
  maxRetries: number;
}

export async function withRetry<T>(
  config: RetryConfig,
  fn: () => Promise<Response>,
  parseResponse: (res: Response) => Promise<T>,
): Promise<T> {
  const startTime = Date.now();

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (Date.now() - startTime > MAX_TOTAL_DURATION) {
      throw new TimeoutError('Request exceeded maximum retry duration of 60s');
    }

    const response = await fn();

    if (!RETRYABLE_STATUS_CODES.has(response.status)) {
      return parseResponse(response);
    }

    if (attempt === config.maxRetries) {
      return parseResponse(response);
    }

    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
    const delay = retryAfterSeconds
      ? retryAfterSeconds * 1000
      : Math.min(Math.pow(2, attempt) * 1000 + Math.random() * 1000, MAX_DELAY);

    await sleep(delay);
  }

  throw new TimeoutError('Max retries exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
