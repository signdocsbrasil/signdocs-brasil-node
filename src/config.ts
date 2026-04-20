import { ResponseMetadata } from './response-metadata';
import { TokenCache } from './token-cache';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface ClientConfig {
  clientId: string;
  clientSecret?: string;
  privateKey?: string;
  kid?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  scopes?: string[];
  httpClient?: typeof fetch;
  logger?: Logger;
  /**
   * Pluggable OAuth token cache. Defaults to in-memory (single Node
   * process). Stateless hosts (serverless, fan-out workers) should
   * supply a shared-store implementation (Redis, DynamoDB, etc.) so
   * tokens survive across worker instances.
   */
  tokenCache?: TokenCache;
  /**
   * Callback fired after every API response with a {@link ResponseMetadata}.
   * Use for observability — rate-limit counters, deprecation warnings,
   * request IDs. Exceptions thrown from the callback are logged (via
   * the configured `logger`, if any) and swallowed — observability must
   * never break the request path.
   */
  onResponse?: (meta: ResponseMetadata) => void;
}

export const DEFAULT_BASE_URL = 'https://api.signdocs.com.br';
export const DEFAULT_TIMEOUT = 30_000;
export const DEFAULT_MAX_RETRIES = 5;
export const DEFAULT_SCOPES = [
  'transactions:read',
  'transactions:write',
  'steps:write',
  'evidence:read',
  'webhooks:write',
];

export function resolveConfig(
  config: ClientConfig,
): Required<
  Omit<ClientConfig, 'clientSecret' | 'privateKey' | 'kid' | 'httpClient' | 'logger' | 'tokenCache' | 'onResponse'>
> &
  Pick<ClientConfig, 'clientSecret' | 'privateKey' | 'kid' | 'httpClient' | 'logger' | 'tokenCache' | 'onResponse'> {
  if (!config.clientId) {
    throw new Error('clientId is required');
  }
  if (!config.clientSecret && !config.privateKey) {
    throw new Error('Either clientSecret or privateKey+kid is required');
  }
  if (config.privateKey && !config.kid) {
    throw new Error('kid is required when using privateKey');
  }

  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    privateKey: config.privateKey,
    kid: config.kid,
    baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
    scopes: config.scopes ?? DEFAULT_SCOPES,
    httpClient: config.httpClient,
    logger: config.logger,
    tokenCache: config.tokenCache,
    onResponse: config.onResponse,
  };
}
