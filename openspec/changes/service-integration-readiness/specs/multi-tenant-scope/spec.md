## Purpose

Define how client cache, authentication, and numbering are scoped so multiple companies and tenants can use the SDK safely in one service process without cross-tenant identity leakage or fiscal consecutive collisions.

## ADDED Requirements

### Requirement: Scope is an explicit input to client creation

The system SHALL require an explicit scope when creating or reusing an authenticated client in a service context. The scope SHALL identify the tenant for authorization and audit, and the fiscal issuer plus environment for authentication and numbering.

#### Scenario: Different tenants with same profile name do not share a client

- **WHEN** two requests use the same profile name but different tenant identifiers
- **THEN** the system creates or reuses distinct authenticated clients

#### Scenario: Missing scope is rejected in service mode

- **WHEN** a caller requests a client without a scope in service mode
- **THEN** the system rejects the request instead of falling back to a global client

### Requirement: Cache key is composite and secret-aware

The system SHALL compute cache keys from the complete scope, configuration fingerprint, and a secret fingerprint. The system SHALL invalidate a cached client when any component of that key changes.

#### Scenario: Profile file change invalidates the cached client

- **WHEN** the stored profile changes environment, issuer, username, or certificate path
- **THEN** the next client request creates a new authenticated client

#### Scenario: Secret rotation invalidates the cached client

- **WHEN** the password, PIN, or token source changes for the same scope
- **THEN** the cached client is discarded and re-authenticated

#### Scenario: Concurrent authentication is shared only for identical snapshots

- **WHEN** concurrent requests use the same scope and identical configuration
- **THEN** they share one in-flight authentication

### Requirement: Numbering is scoped by fiscal identity, not tenant

The system SHALL allocate consecutive numbers by issuer identity, environment, document type, branch, and terminal. The tenant SHALL NOT be part of the numbering key.

#### Scenario: Two tenants for the same issuer share a consecutive series

- **WHEN** two tenants represent the same fiscal issuer in the same environment
- **THEN** their documents consume the same consecutive series

#### Scenario: Different issuers do not share a consecutive series

- **WHEN** two different fiscal issuers create documents in the same environment
- **THEN** their consecutive series are independent

#### Scenario: Different environments do not share a consecutive series

- **WHEN** the same issuer creates documents in sandbox and production
- **THEN** their consecutive series are independent

### Requirement: Scope identity must match authenticated identity

The system SHALL validate that the scope's issuer identity matches the identity of the configured credentials or token before caching or authenticating. On mismatch it SHALL throw an auth error.

#### Scenario: Mismatched scope is rejected

- **WHEN** a caller provides a scope for one issuer but credentials for another
- **THEN** the system rejects the request with an auth error

#### Scenario: Matching scope is accepted

- **WHEN** a caller provides a scope whose issuer matches the configured credentials
- **THEN** the system proceeds with caching and authentication

### Requirement: Tenant is retained for authorization and audit

The system SHALL retain tenant identity in the operation intent and document metadata even though it is excluded from numbering and cache identity where fiscal identity applies.

#### Scenario: Tenant is preserved in persisted document metadata

- **WHEN** a document is persisted
- **THEN** its metadata includes the tenant that originated the operation

### Requirement: Local counters are not authoritative across processes

The system SHALL document that local file counters coordinate only one process and one disk. A service with multiple processes or hosts SHALL reserve consecutives in its own durable store.

#### Scenario: Multi-process service uses external reservation

- **WHEN** a service runs multiple workers or containers
- **THEN** it reserves consecutives through its own transactional store rather than relying on local files
