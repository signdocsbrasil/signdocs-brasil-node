import { AuthHandler } from './auth';
import { Logger } from './config';
import { ConnectionError, TimeoutError, parseApiError } from './errors';
import { withRetry } from './retry';
import * as crypto from 'crypto';

export interface RequestOptions {
  method: string;
  path: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  noAuth?: boolean;
  timeout?: number;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly auth: AuthHandler;
  private readonly fetchFn: typeof fetch;
  private readonly logger?: Logger;

  constructor(opts: {
    baseUrl: string;
    timeout: number;
    maxRetries: number;
    auth: AuthHandler;
    fetchFn?: typeof fetch;
    logger?: Logger;
  }) {
    this.baseUrl = opts.baseUrl;
    this.timeout = opts.timeout;
    this.maxRetries = opts.maxRetries;
    this.auth = opts.auth;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.logger = opts.logger;
  }

  async request<T>(opts: RequestOptions): Promise<T> {
    const effectiveTimeout = opts.timeout ?? this.timeout;
    let start = 0;

    return withRetry(
      { maxRetries: this.maxRetries },
      async () => {
        const url = this.buildUrl(opts.path, opts.query);
        const headers: Record<string, string> = {
          'User-Agent': 'signdocs-brasil-node/1.0.0',
          ...opts.headers,
        };

        if (!opts.noAuth) {
          const token = await this.auth.getAccessToken();
          headers['Authorization'] = `Bearer ${token}`;
        }

        if (opts.body !== undefined) {
          headers['Content-Type'] = 'application/json';
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);
        start = Date.now();

        try {
          return await this.fetchFn(url, {
            method: opts.method,
            headers,
            body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
            signal: controller.signal,
          });
        } catch (error: any) {
          const durationMs = Date.now() - start;
          if (error.name === 'AbortError') {
            this.logger?.warn('request failed', { method: opts.method, path: opts.path, durationMs, error: 'timeout' });
            throw new TimeoutError(`Request to ${opts.path} timed out after ${effectiveTimeout}ms`);
          }
          this.logger?.warn('request failed', { method: opts.method, path: opts.path, durationMs, error: 'connection' });
          throw new ConnectionError(`Failed to connect to ${url}: ${error.message}`);
        } finally {
          clearTimeout(timeoutId);
        }
      },
      async (response: Response) => {
        const durationMs = Date.now() - start;

        if (response.status === 204) {
          this.logger?.info('request completed', { method: opts.method, path: opts.path, status: response.status, durationMs });
          return undefined as T;
        }

        const contentType = response.headers.get('content-type') ?? '';
        let body: unknown;
        if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
          body = await response.json();
        } else {
          body = await response.text();
        }

        if (!response.ok) {
          this.logger?.warn('request failed', { method: opts.method, path: opts.path, status: response.status, durationMs });
          const retryAfter = response.headers.get('Retry-After');
          throw parseApiError(
            response.status,
            body,
            retryAfter ? parseInt(retryAfter, 10) : undefined,
          );
        }

        this.logger?.info('request completed', { method: opts.method, path: opts.path, status: response.status, durationMs });
        return body as T;
      },
    );
  }

  async requestWithIdempotency<T>(opts: RequestOptions, idempotencyKey?: string): Promise<T> {
    const key = idempotencyKey ?? crypto.randomUUID();
    return this.request<T>({
      ...opts,
      headers: {
        ...opts.headers,
        'X-Idempotency-Key': key,
      },
    });
  }

  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }
}
