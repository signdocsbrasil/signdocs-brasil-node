# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
