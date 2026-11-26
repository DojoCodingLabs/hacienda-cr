## 1. Scope and client cache

- [x] 1.1 Define public `Scope` type and `ScopeSchema` validation in the SDK (reusing `CedulaTypeSchema` and the profile environment schema), with a cross-check against the configured profile identity in the MCP client cache.
- [x] 1.2 Implement a composite, bounded (LRU, 16 entries) cache key in MCP api-client using scope, config fingerprint, and secret fingerprint.
- [x] 1.3 Add tests for `SCOPE_IDENTITY_MISMATCH`, tenant isolation, invalid scopes, cache bounds, and invalidation on profile, issuer, environment, and secret changes.
- [x] 1.4 Accept an optional scope in `createMcpApiClient` and document that scope is for SDK consumers; MCP tools derive it from the profile.
- [ ] 1.5 Wire scope through MCP tools and `nextIssuerSequence` (not done: tools derive scope from the profile; issuer sequences are already keyed by environment and issuer).
- [ ] 1.6 Reject a missing scope in a dedicated service mode (not done: no service mode exists).
- [ ] 1.7 Persist tenant identity in document metadata (not done: the SDK `StoredDocument` has no tenant field).
- [x] 1.8 Update docs to state that tenant is excluded from numbering keys.

## 2. Secret redaction

- [x] 2.1 Sanitize `HaciendaError`/`ApiError` messages and response bodies, and `ValidationError` details, at construction.
- [x] 2.2 Sanitize `AuthError` messages at construction.
- [x] 2.3 Add hostile-message redaction tests for SDK error construction.
- [ ] 2.4 Add hostile-message redaction tests for CLI JSON output and MCP tool responses (not done in this change).
- [x] 2.5 Verify redaction does not mutate caller data.
- [x] 2.6 Ignore short (under 8 characters) and boolean-like values of generic secret-named environment variables, keeping known Hacienda credentials redacted from 4 characters (#148).

## 3. Transport timeout defaults

- [x] 3.1 Add central `fetchWithTimeout` utility with default 30s, redirect blocking, external signal propagation, and listener/timer cleanup; export it and `FetchWithTimeoutOptions` from the package root.
- [x] 3.2 Refactor `HttpClient` to use the utility while preserving its request-scoped deadline over the body read.
- [x] 3.3 Refactor `TokenManager` to use the utility with one request-scoped deadline spanning fetch and body reads.
- [x] 3.4 Add tests for timeout, external abort, listener cleanup, and a stalled token body.
- [ ] 3.5 Enforce the 1000–300000 ms override range from design D7 (not done).
- [ ] 3.6 Add a total operation budget distinct from per-request timeouts (not done in this change).

## 4. Durable recovery and callbacks

- [x] 4.1 Add `reconcileByClave` returning `found` / `not_found` (404) / `unknown` (5xx, network, timeout), validating the clave with the shared schema before any network access.
- [x] 4.2 Add `classifyOutcome` for success/rejected/pending/transport_error/unknown, distinguishing pending from unknown.
- [x] 4.3 Add a callback payload parser for the JSON envelope (`clave`, `fecha`, `ind-estado`, optional `respuesta-xml` Base64) with strict Base64, byte caps, a required signed `MensajeHacienda` root, and clave binding.
- [x] 4.4 Document the callback receiver contract and idempotency by clave.
- [x] 4.5 Add tests for malformed callback payloads, the mock's real callback body, and mocked-HTTP reconciliation.
- [ ] 4.6 Reject a retry that sends different document bytes for the same clave (not done in this change).

## 5. Documentation and verification

- [x] 5.1 Update the production-integration guide with scope and recovery guidance.
- [x] 5.2 Run `pnpm verify` and `pnpm test:coverage` at the top of the stack.
- [x] 5.3 Add changesets for published package behavior changes.
- [x] 5.4 Add installed-consumer checks for the new root exports.
