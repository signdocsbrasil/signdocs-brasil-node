# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.1] - 2026-06-25

### Changed

- API-documentation link in README now points to https://docs.signdocs.com.br (was a dead relative path).

## [1.6.0] - 2026-06-24

### Added

- `client.verification.verifyDocument(request)` — wraps the new `POST /v1/verify/document` endpoint, which inspects an uploaded PDF for embedded electronic/digital signatures. Unlike the other `verify*` methods, this endpoint is **authenticated** (Bearer JWT) and requires the `verification:write` scope; it is also **production-credentials only** (the detection backend is not provisioned in HML).
- New types `VerifyDocumentRequest`, `VerifyDocumentResponse`, `DetectedSignature`, and the `SignatureType` union (`'pades' | 'pkcs7' | 'legacy' | 'digital_certificate'`).

### Changed

- `User-Agent` bumped to `signdocs-brasil-node/1.6.0`.

## [1.5.0] - 2026-04-27

### Added

- `envelopeId?: string` on `VerificationResponse` — populated when the verified evidence belongs to a multi-signer envelope. Use it to drill back up to the envelope via `client.verification.verifyEnvelope(envelopeId)`. Omitted for standalone signing-session evidences.
- Three new webhook event types in `WebhookEventType` and `WEBHOOK_EVENT_TYPES`:
  - `ENVELOPE.CREATED` — emitted when a multi-signer envelope is created.
  - `ENVELOPE.ALL_SIGNED` — emitted when every signer has completed.
  - `ENVELOPE.EXPIRED` — emitted when an envelope expires with one or more pending signatures.

### Changed

- `User-Agent` bumped to `signdocs-brasil-node/1.5.0`.

## [1.4.1] - 2026-04-27

### Fixed

- `WebhookTestResponse` shape — was `{deliveryId, status, statusCode}`, now matches the API spec `{webhookId, testDelivery: {httpStatus, success, error?, timestamp}}`. The typed wrapper around `webhooks.test()` was returning all-empty fields against the live API. Introduced new `WebhookTestDelivery` interface (also exported). Same fix applied across the PHP SDK and the four other language SDKs in parallel.

### Changed

- `User-Agent` bumped to `signdocs-brasil-node/1.4.1`.

## [1.4.0] - 2026-04-23

### Added

- `Owner` interface — optional requester identity (`{ email?, name? }`) on `CreateSigningSessionRequest` and `CreateEnvelopeRequest`. When provided, SignDocs automatically:
  1. Emails each signer an invitation with their signing URL when `signer.email` differs from `owner.email` (case-insensitive).
  2. Emails the owner a completion notification per signer completion (and a final "all signed" message for envelopes).
  Omit `owner` to keep the traditional behavior (caller delivers signing URLs out-of-band and uses webhooks for completion state).
- `inviteSent` boolean on the create-session response (`SigningSession`) and on `EnvelopeSession`. Set to `true` when SignDocs dispatched an invitation email at creation time.

### Changed

- `User-Agent` bumped to `signdocs-brasil-node/1.4.0`.

## [1.3.0] - 2026-04-20

### Fixed

- `webhooks.list()` now returns an actual `Webhook[]` matching its declared type. Previously it returned the raw `{webhooks, count}` API envelope, so `.length`, `.map()`, and iteration all failed at runtime. The method now unwraps the envelope (and accepts a bare array defensively for test fixtures).

### Added

- `TokenCache` interface — pluggable OAuth token cache. Inject via `new SignDocsBrasilClient({ tokenCache })` to share tokens across serverless workers / fan-out processes. Default `InMemoryTokenCache` preserves pre-1.3 single-process behavior.
- `CachedToken` type and `InMemoryTokenCache` default implementation exported from the top-level entry point.
- `deriveCacheKey(clientId, baseUrl, scopes)` helper — deterministic SHA-256 cache key (first 32 hex chars, `signdocs.oauth.` prefix). Scopes are sorted and trailing slash on `baseUrl` is trimmed so equivalent configurations share a cache slot.
- `ResponseMetadata` type + `onResponse` callback on `ClientConfig` — captures `RateLimit-*`, `Deprecation`, `Sunset`, and request-ID headers from every API response. Exceptions thrown from the callback are logged (via the configured `logger`) and swallowed so observability never breaks the request path.
- Webhook event types for the NT65 INSS consignado flow:
  - `STEP.PURPOSE_DISCLOSURE_SENT` — purpose-disclosure notification delivered to the beneficiary.
  - `TRANSACTION.DEADLINE_APPROACHING` — two business days remaining until the INSS submission deadline.
- `WEBHOOK_EVENT_TYPES` readonly array and `isNt65Event(event)` helper (plus `NT65_WEBHOOK_EVENTS` set) for inspecting the canonical event catalog.

### Changed

- `AuthHandler.getAccessToken()` now reads from and writes to the configured `TokenCache`. Cache keys are derived deterministically from `clientId + baseUrl + scopes` (SHA-256 truncated to 32 chars) so the same credentials reuse the same cached token across process boundaries.
- `AuthHandler.invalidate()` now deletes the cache entry instead of clearing an internal field.
- `User-Agent` bumped to `signdocs-brasil-node/1.3.0`.

## [1.2.0] - 2026-04-14

### Added

- `verification.verifyEnvelope(envelopeId)` — public resource method for the new `GET /v1/verify/envelope/{envelopeId}` endpoint. Returns envelope status, signers list (each with `evidenceId` for drill-down via `verification.verify()`), and consolidated download URLs.
- `EnvelopeVerificationResponse`, `EnvelopeVerificationSigner`, and `VerificationDownloadArtifact` types. For non-PDF envelopes signed with digital certificates, `downloads.consolidatedSignature` exposes a single PKCS#7 / CMS detached `.p7s` containing every signer's `SignerInfo`. For PDF envelopes, `downloads.combinedSignedPdf` exposes the merged PDF.
- `VerificationResponse.signer.cpfCnpj` and `VerificationResponse.tenantCnpj` fields (previously returned by the API but not typed by the SDK).
- `VerificationDownloadsResponse.downloads.originalDocument` and `signedSignature` fields (previously undocumented), matching the real shape the API returns.

### Changed

- `VerificationDownloadsResponse.downloads.signedSignature` is now omitted by the API when the evidence belongs to a multi-signer envelope. For standalone signing sessions (single-signer non-PDF with digital certificate) the field is still populated. To retrieve the consolidated `.p7s` for an envelope, use `verification.verifyEnvelope()` instead.

### Removed

- `VerificationDownloadsResponse.downloads.signedPdf` — the field was typed by the SDK but never actually returned by the API. No real-world consumer could have depended on it.

## [1.1.0] - 2026-03-27

### Added

- Envelopes resource (`client.envelopes`): create, get, addSession, combinedStamp — multi-signer workflows with parallel or sequential signing
- New types: CreateEnvelopeRequest, Envelope, AddEnvelopeSessionRequest, EnvelopeSession, EnvelopeSessionSummary, EnvelopeDetail, EnvelopeCombinedStampResponse

## [1.0.0] - 2026-03-02

### Added

- Full API coverage: transactions, documents, steps, signing, evidence, verification, users, webhooks, document groups, health
- OAuth2 `client_credentials` authentication with client secret
- Private Key JWT (ES256) authentication with `client_assertion`
- Automatic token caching with 30-second refresh buffer
- Concurrent token request coalescing
- Auto-pagination via `listAutoPaginate()` async generator on transactions
- Exponential backoff retry with jitter (429, 500, 503)
- Retry-After header support
- Idempotency keys (auto-generated UUID) on POST requests
- Typed exceptions for all HTTP error codes (RFC 7807 Problem Details)
- Webhook signature verification (HMAC-SHA256, constant-time comparison)
- Configurable base URL, timeout, max retries, and scopes
- Zero runtime dependencies (uses native `fetch`)
- Full TypeScript type definitions
