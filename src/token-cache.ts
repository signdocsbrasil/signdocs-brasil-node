import { createHash } from 'node:crypto';

/**
 * Immutable value object representing a cached OAuth2 access token
 * along with its absolute expiry timestamp (ms since Unix epoch).
 */
export interface CachedToken {
  readonly accessToken: string;
  /** Absolute expiry time in milliseconds since Unix epoch. */
  readonly expiresAt: number;
}

/**
 * Pluggable cache for OAuth2 access tokens.
 *
 * Default implementation is {@link InMemoryTokenCache}, which scopes the
 * cache to the lifetime of a single Node process. Long-lived servers can
 * keep using the default. Stateless hosts (serverless, fan-out workers)
 * should supply an implementation backed by a shared store (Redis,
 * DynamoDB, etc.) to avoid fetching a fresh token on every request.
 *
 * Implementations MUST be safe to call concurrently — i.e. a `set()` that
 * races with another `set()` for the same key should leave the cache in
 * a consistent state. Implementations SHOULD treat the key as opaque;
 * the SDK derives keys deterministically from credentials + base URL.
 */
export interface TokenCache {
  /**
   * Retrieve a cached token for `key`, or null if missing or expired.
   * Implementations SHOULD return null (not throw) on any backend error.
   */
  get(key: string): CachedToken | null;

  /**
   * Store `token` under `key`. Implementations SHOULD honor the token's
   * `expiresAt` as the storage TTL upper bound.
   */
  set(key: string, token: CachedToken): void;

  /**
   * Remove the cached token for `key`. Idempotent: deleting a missing
   * entry is a no-op.
   */
  delete(key: string): void;
}

/**
 * Default in-process token cache. Equivalent to the behavior the SDK
 * shipped with in 1.2.x and earlier — cache lives for the lifetime of
 * the Node process.
 */
export class InMemoryTokenCache implements TokenCache {
  private readonly store = new Map<string, CachedToken>();

  get(key: string): CachedToken | null {
    const entry = this.store.get(key);
    if (entry === undefined) {
      return null;
    }

    // No skew here — callers apply their own skew window. Only evict
    // entries whose expiresAt is already in the past.
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  set(key: string, token: CachedToken): void {
    this.store.set(key, token);
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

/**
 * Cache key derived deterministically from credentials + base URL +
 * scopes. Hashed so that a leaked cache key cannot be reversed to
 * recover the client ID.
 *
 * Canonicalization rules (must match PHP / other SDKs):
 *   - scopes are sorted lexicographically
 *   - baseUrl has any trailing slash trimmed
 *   - material is `clientId|baseUrl|scope1 scope2 ...`
 *   - SHA-256 hex, first 32 chars, prefixed with `signdocs.oauth.`
 */
export function deriveCacheKey(
  clientId: string,
  baseUrl: string,
  scopes: readonly string[],
): string {
  const canonicalScopes = [...scopes].sort();
  const trimmedBaseUrl = baseUrl.replace(/\/+$/, '');
  const material = `${clientId}|${trimmedBaseUrl}|${canonicalScopes.join(' ')}`;
  const digest = createHash('sha256').update(material).digest('hex');
  return `signdocs.oauth.${digest.slice(0, 32)}`;
}
