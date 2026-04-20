import * as crypto from 'crypto';
import { AuthenticationError } from './errors';
import { CachedToken, InMemoryTokenCache, TokenCache, deriveCacheKey } from './token-cache';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Handles OAuth2 client_credentials token acquisition for both
 * client_secret and private_key_jwt (ES256) authentication modes.
 *
 * Tokens are cached via a pluggable {@link TokenCache}. The default
 * {@link InMemoryTokenCache} preserves the pre-1.3 behavior of caching
 * in process memory. Stateless hosts (serverless, fan-out workers)
 * should inject a shared-store cache (Redis, DynamoDB, etc.) to avoid
 * fetching a fresh token on every request.
 */
export class AuthHandler {
  private readonly clientId: string;
  private readonly clientSecret?: string;
  private readonly privateKey?: string;
  private readonly kid?: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private readonly scopes: string[];
  private readonly cache: TokenCache;
  private readonly cacheKey: string;
  private refreshPromise: Promise<string> | null = null;

  constructor(opts: {
    clientId: string;
    clientSecret?: string;
    privateKey?: string;
    kid?: string;
    baseUrl: string;
    scopes: string[];
    cache?: TokenCache;
  }) {
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.privateKey = opts.privateKey;
    this.kid = opts.kid;
    this.baseUrl = opts.baseUrl;
    this.tokenUrl = `${opts.baseUrl}/oauth2/token`;
    this.scopes = opts.scopes;
    this.cache = opts.cache ?? new InMemoryTokenCache();
    this.cacheKey = deriveCacheKey(opts.clientId, opts.baseUrl, opts.scopes);
  }

  async getAccessToken(): Promise<string> {
    const cached = this.cache.get(this.cacheKey);
    if (cached && Date.now() < cached.expiresAt - 30_000) {
      return cached.accessToken;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.fetchToken();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Invalidate the cached token so that the next call to getAccessToken()
   * will fetch a fresh token from the authorization server.
   */
  invalidate(): void {
    this.cache.delete(this.cacheKey);
  }

  private async fetchToken(): Promise<string> {
    const params = new URLSearchParams();
    params.set('grant_type', 'client_credentials');
    params.set('client_id', this.clientId);
    params.set('scope', this.scopes.join(' '));

    if (this.clientSecret) {
      params.set('client_secret', this.clientSecret);
    } else if (this.privateKey && this.kid) {
      const assertion = this.buildJwtAssertion();
      params.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
      params.set('client_assertion', assertion);
    }

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AuthenticationError(`Token request failed (${response.status}): ${body}`);
    }

    const data = await response.json() as TokenResponse;
    const token: CachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    this.cache.set(this.cacheKey, token);

    return data.access_token;
  }

  private buildJwtAssertion(): string {
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'ES256',
      typ: 'JWT',
      kid: this.kid,
    };
    const payload = {
      iss: this.clientId,
      sub: this.clientId,
      aud: this.tokenUrl,
      exp: now + 300,
      iat: now,
      jti: crypto.randomUUID(),
    };

    const encodedHeader = base64urlEncode(JSON.stringify(header));
    const encodedPayload = base64urlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const sign = crypto.createSign('SHA256');
    sign.update(signingInput);
    const signature = sign.sign(this.privateKey!, 'base64');
    const encodedSignature = base64urlFromBase64(signature);

    return `${signingInput}.${encodedSignature}`;
  }
}

function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlFromBase64(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
