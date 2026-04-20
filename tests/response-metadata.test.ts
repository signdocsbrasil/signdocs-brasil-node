import { fromHeaders } from '../src/response-metadata';

function headers(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe('ResponseMetadata.fromHeaders', () => {
  it('parses RateLimit-* headers as integers', () => {
    const meta = fromHeaders(
      headers({
        'RateLimit-Limit': '2000',
        'RateLimit-Remaining': '1987',
        'RateLimit-Reset': '42',
      }),
      'GET',
      '/v1/transactions',
      200,
    );

    expect(meta.rateLimitLimit).toBe(2000);
    expect(meta.rateLimitRemaining).toBe(1987);
    expect(meta.rateLimitReset).toBe(42);
  });

  it('leaves missing headers as null', () => {
    const meta = fromHeaders(headers({}), 'GET', '/v1/health', 200);

    expect(meta.rateLimitLimit).toBeNull();
    expect(meta.rateLimitRemaining).toBeNull();
    expect(meta.rateLimitReset).toBeNull();
    expect(meta.deprecation).toBeNull();
    expect(meta.sunset).toBeNull();
    expect(meta.requestId).toBeNull();
    expect(meta.isDeprecated()).toBe(false);
  });

  it('returns null for non-numeric RateLimit headers', () => {
    const meta = fromHeaders(
      headers({ 'RateLimit-Limit': 'unlimited' }),
      'GET',
      '/v1/x',
      200,
    );

    expect(meta.rateLimitLimit).toBeNull();
  });

  it('parses the Deprecation header as `@<unix-seconds>` (RFC 8594)', () => {
    const meta = fromHeaders(
      headers({ Deprecation: '@1725148800' }),
      'GET',
      '/v1/old',
      200,
    );

    expect(meta.deprecation).not.toBeNull();
    expect(meta.deprecation!.getTime()).toBe(1725148800 * 1000);
    expect(meta.isDeprecated()).toBe(true);
  });

  it('parses the Sunset header as an IMF-fixdate (RFC 8594)', () => {
    // Sep 1, 2026 is a Tuesday.
    const meta = fromHeaders(
      headers({ Sunset: 'Tue, 01 Sep 2026 00:00:00 GMT' }),
      'POST',
      '/admin/tenants/42/mode',
      200,
    );

    expect(meta.sunset).not.toBeNull();
    expect(meta.sunset!.getTime()).toBe(Date.UTC(2026, 8, 1, 0, 0, 0));
  });

  it('returns null for unparseable Deprecation input', () => {
    const meta = fromHeaders(
      headers({ Deprecation: 'not-a-date-at-all' }),
      'GET',
      '/v1/x',
      200,
    );

    expect(meta.deprecation).toBeNull();
    expect(meta.isDeprecated()).toBe(false);
  });

  it('reads the request ID from X-Request-Id', () => {
    const meta = fromHeaders(
      headers({ 'X-Request-Id': 'req_abc' }),
      'GET',
      '/v1/x',
      200,
    );

    expect(meta.requestId).toBe('req_abc');
  });

  it('falls back to X-SignDocs-Request-Id when X-Request-Id is absent', () => {
    const meta = fromHeaders(
      headers({ 'X-SignDocs-Request-Id': 'req_xyz' }),
      'GET',
      '/v1/x',
      200,
    );

    expect(meta.requestId).toBe('req_xyz');
  });

  it('prefers X-Request-Id over X-SignDocs-Request-Id when both are present', () => {
    const meta = fromHeaders(
      headers({ 'X-Request-Id': 'req_primary', 'X-SignDocs-Request-Id': 'req_fallback' }),
      'GET',
      '/v1/x',
      200,
    );

    expect(meta.requestId).toBe('req_primary');
  });

  it('normalizes the HTTP method to uppercase', () => {
    const meta = fromHeaders(headers({}), 'post', '/v1/x', 201);

    expect(meta.method).toBe('POST');
    expect(meta.statusCode).toBe(201);
  });
});
