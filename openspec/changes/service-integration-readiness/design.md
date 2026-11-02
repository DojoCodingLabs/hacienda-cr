## Context

Current state and constraints are documented in `proposal.md` and the existing specs (`delivery`, `business-days`, etc.). The SDK already exposes `HttpClient`, `TokenManager`, `DocumentStore`, state machine, and redaction. The gap is service-level scope, error sanitization at creation, default transport safety, and recovery helpers. The SDK must remain database-agnostic.

## Goals / Non-Goals

**Goals:**

- Make multi-tenant usage safe by default without changing fiscal behavior.
- Prevent secret leakage through errors and adapter boundaries.
- Guarantee bounded network I/O unless explicitly overridden.
- Provide recovery primitives and callback validation for durable services.

**Non-Goals:**

- Implementing a database-backed `DocumentStore` or worker scheduler in the SDK.
- Changing Hacienda fiscal rules, deadlines, or validation.
- Replacing local MCP/CLI workflows; they remain supported with safe defaults.

## Decisions

### D1: Scope object and composite cache key

- **Choice**: Introduce a public `Scope` with `tenantId?`, `environment`, and `issuer { idType, idNumber }`. Cache key = `sha256(JSON.stringify(scope) + configFingerprint + secretFingerprint)`.
- **Rationale**: Tenant alone cannot identify fiscal identity; environment and issuer are required for auth and numbering. Composite key prevents stale reuse.
- **Alternative**: Cache by profile name only — rejected because it hides identity changes in long-lived processes.

### D2: Numbering by fiscal identity, tenant only for metadata

- **Choice**: Keep `issuerSequenceDirectory` keyed by environment + issuer identity. Tenant is stored in intent/document metadata but excluded from counter key.
- **Rationale**: Two tenants for the same issuer must share a consecutive series; adding tenant to the key would create duplicate series.
- **Alternative**: Include tenant in counter key — rejected because it violates fiscal consecutive uniqueness.

### D3: Sanitize at error creation and adapter boundaries

- **Choice**: `ApiError`, `AuthError`, and transport/parse errors sanitize message and `data` at construction. CLI/MCP additionally wrap boundary errors.
- **Rationale**: Centralizes redaction and protects all downstream consumers, not only Logger.
- **Alternative**: Sanitize only in Logger — rejected because errors travel outside logging.

### D4: Central `fetchWithTimeout` utility

- **Choice**: Add a shared fetch wrapper with default 30s, `redirect: "error"`, and signal propagation. All SDK network calls use it; `HttpClient` and `TokenManager` delegate to it.
- **Rationale**: Removes inconsistent transport behavior and ensures cancellation end to end.
- **Alternative**: Keep per-client timeout only — rejected because auxiliary fetches could bypass it.

### D5: Database-agnostic recovery primitives

- **Choice**: Keep `DocumentStore` as interface. Add helpers: `reconcileByClave`, `classifyOutcome`, `parseCallbackPayload`, `validateCallbackPayload`. Service implements persistence and worker scheduling.
- **Rationale**: SDK stays portable; service owns DB and concurrency.
- **Alternative**: Embed a SQL store in SDK — rejected due to dependency and deployment constraints.

### D6: Callback parsing in SDK, receiver in service

- **Choice**: The callback arrives as a JSON envelope with `clave`, `fecha`, `indEstado`, and `respuestaXml` (Base64). The SDK decodes `respuestaXml` and validates the resulting XML against `MensajeHacienda`. The service implements the HTTP endpoint, returns 200, and handles retries.
- **Rationale**: Parsing/validation is domain logic; HTTP serving is application concern. The JSON envelope is the official transport format, not raw XML.

### D7: Safe defaults with validated overrides

- **Choice**: Defaults remain 30s request, 30s token, 60s operation. Overrides are allowed only between 1000 ms and 300000 ms.
- **Rationale**: Protects services from accidental unlimited waits while permitting tuning.

### D8: Scope must match authenticated identity

- **Choice**: The SDK validates that `Scope.issuer` matches the identity extracted from configured credentials or token before caching or authenticating. On mismatch it throws `AuthError`.
- **Rationale**: Prevents a service from caching under one issuer while authenticating as another.
- **Alternative**: Trust caller scope — rejected because it breaks tenant isolation.

## Risks / Trade-offs

- [BREAKING MCP API] → Document migration and keep backward-compatible wrappers where feasible.
- [Scope misuse] → Reject missing scope in service mode; keep local mode for MCP/CLI with explicit default scope.
- [Scope/credential mismatch] → Fail early with `AuthError` before caching or authenticating.
- [Over-redaction] → Use key normalization and tests to avoid masking non-secret fields.
- [Timeout too short for slow networks] → Allow validated overrides and document tuning.
- [Callback replay] → Service must process idempotently by clave; SDK provides parser only.

## Migration Plan

1. Add `Scope` type and composite cache key in SDK; update MCP `createMcpApiClient` to accept/derive scope.
2. Update `nextIssuerSequence` to accept scope-derived issuer identity (already supported by params).
3. Add sanitization to error constructors and adapter boundaries.
4. Introduce `fetchWithTimeout` and refactor `HttpClient`/`TokenManager`.
5. Add recovery helpers and callback parser/validator.
6. Update docs and examples; add tests for scope, redaction, timeout, recovery.
7. Rollback: revert to previous SDK version; no data migration required because store interface unchanged.

## Open Questions

- Should `Scope` be required for CLI commands or only for programmatic service use? (Can be resolved during implementation without changing specs.)
