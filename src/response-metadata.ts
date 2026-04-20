/**
 * Captures response-level metadata that's typically consumed for
 * observability and lifecycle signaling: rate-limit counters
 * (IETF `RateLimit-*` headers), RFC 8594 deprecation signaling, and
 * the upstream request ID.
 *
 * Exposed via the `onResponse` callback on {@link ClientConfig}. The SDK
 * does not otherwise surface these headers to resource methods, so
 * the callback is the single place to plug in observability.
 */
export interface ResponseMetadata {
  /** From `RateLimit-Limit`. */
  readonly rateLimitLimit: number | null;
  /** From `RateLimit-Remaining`. */
  readonly rateLimitRemaining: number | null;
  /** From `RateLimit-Reset` (seconds from now). */
  readonly rateLimitReset: number | null;
  /** Parsed `Deprecation` header (RFC 8594). */
  readonly deprecation: Date | null;
  /** Parsed `Sunset` header (RFC 8594). */
  readonly sunset: Date | null;
  /** Upstream `X-Request-Id` or `X-SignDocs-Request-Id`. */
  readonly requestId: string | null;
  /** HTTP status code. */
  readonly statusCode: number;
  /** HTTP method, uppercased. */
  readonly method: string;
  /** Request path (with query string if any). */
  readonly path: string;
  /** True if the endpoint is marked deprecated (has a Deprecation header). */
  isDeprecated(): boolean;
}

/**
 * Minimal subset of the Fetch `Headers` / Node `IncomingHttpHeaders`
 * surface we actually use. Anything that can hand back a header value
 * by name works.
 */
export interface HeaderLike {
  get(name: string): string | null;
}

/**
 * Build a {@link ResponseMetadata} from a response's headers.
 *
 * Accepts the standard `Headers` instance returned by `fetch()` or any
 * object exposing the same `get(name)` shape.
 */
export function fromHeaders(
  headers: HeaderLike,
  method: string,
  path: string,
  statusCode: number,
): ResponseMetadata {
  const rateLimitLimit = intHeader(headers, 'RateLimit-Limit');
  const rateLimitRemaining = intHeader(headers, 'RateLimit-Remaining');
  const rateLimitReset = intHeader(headers, 'RateLimit-Reset');
  const deprecation = rfc8594Date(headers.get('Deprecation'));
  const sunset = rfc8594Date(headers.get('Sunset'));
  const requestId = firstHeader(headers, ['X-Request-Id', 'X-SignDocs-Request-Id']);

  return {
    rateLimitLimit,
    rateLimitRemaining,
    rateLimitReset,
    deprecation,
    sunset,
    requestId,
    statusCode,
    method: method.toUpperCase(),
    path,
    isDeprecated(): boolean {
      return deprecation !== null;
    },
  };
}

function intHeader(headers: HeaderLike, name: string): number | null {
  const value = headers.get(name);
  if (value === null || value === '') {
    return null;
  }
  if (!/^-?\d+$/.test(value)) {
    return null;
  }
  return parseInt(value, 10);
}

function firstHeader(headers: HeaderLike, names: readonly string[]): string | null {
  for (const name of names) {
    const value = headers.get(name);
    if (value !== null && value !== '') {
      return value;
    }
  }
  return null;
}

/**
 * Parse an RFC 8594 `Deprecation` / `Sunset` header. Accepts either an
 * IMF-fixdate (HTTP-date) or an `@<unix-seconds>` form. Returns `null`
 * for any unparseable input.
 */
function rfc8594Date(raw: string | null): Date | null {
  if (raw === null) {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }

  // `@<unix-seconds>` form
  const atMatch = /^@(-?\d+)$/.exec(trimmed);
  if (atMatch) {
    const seconds = parseInt(atMatch[1], 10);
    if (Number.isNaN(seconds)) {
      return null;
    }
    const date = new Date(seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // IMF-fixdate / any `Date`-parseable form. Bare integers and unknown
  // tokens (e.g. `not-a-date-at-all`) must yield null.
  if (/^-?\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}
