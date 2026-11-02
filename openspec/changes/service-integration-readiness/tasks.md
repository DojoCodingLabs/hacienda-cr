## 1. Scope and client cache

- [x] 1.1 Define public `Scope` type and validation in shared/SDK, including cross-check against authenticated identity.
- [x] 1.2 Implement composite cache key in MCP api-client using scope, config fingerprint, and secret fingerprint.
- [x] 1.3 Add invalidation tests for profile, issuer, environment, and secret changes.
- [x] 1.4 Update `createMcpApiClient` signature to accept scope and document migration.
- [x] 1.5 Update docs to state that tenant is excluded from numbering keys.

## 2. Secret redaction

- [x] 2.1 Sanitize `ApiError` message and data at construction.
- [x] 2.2 Sanitize `AuthError` and transport/parse errors at construction.
- [x] 2.3 Add hostile-message redaction tests for CLI JSON and MCP responses.
- [x] 2.4 Verify redaction does not mutate original errors.

## 3. Transport timeout defaults

- [x] 3.1 Add central `fetchWithTimeout` utility with default 30s and redirect blocking.
- [x] 3.2 Refactor `HttpClient` to use the utility while preserving overrides.
- [x] 3.3 Refactor `TokenManager` to use the utility.
- [x] 3.4 Add cancellation propagation tests across auth, request, retry, and body read.

## 4. Durable recovery and callbacks

- [x] 4.1 Add `reconcileByClave` helper using existing status query.
- [x] 4.2 Add outcome classification helper for success/rejected/transport_error/ambiguous, distinguishing pending/processing from unknown.
- [x] 4.3 Add callback payload parser for the JSON envelope (`clave`, `fecha`, `indEstado`, `respuestaXml` Base64) plus `MensajeHacienda` XML validation.
- [x] 4.4 Document callback receiver contract and idempotency by clave.
- [x] 4.5 Add tests for malformed callback payloads and reconciliation.

## 5. Documentation and verification

- [x] 5.1 Update production-integration guide with scope and recovery guidance.
- [x] 5.2 Run `pnpm verify` and fix regressions.
- [x] 5.3 Add changeset for published package behavior changes.
