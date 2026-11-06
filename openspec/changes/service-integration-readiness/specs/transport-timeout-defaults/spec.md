## Purpose

Make every network operation in the SDK fail safely by default through bounded timeouts, blocked redirects, and propagated cancellation, preventing hung service workers and credential leakage across redirects.

## ADDED Requirements

### Requirement: Default timeout is enforced for all SDK network calls

The system SHALL enforce a finite default timeout for every network call made by the SDK, including authentication, submission, status queries, and any auxiliary fetch.

#### Scenario: Stalled request is aborted

- **WHEN** a network endpoint never responds
- **THEN** the SDK aborts the request within the configured timeout

#### Scenario: Invalid timeout is rejected

- **WHEN** a caller configures a non-finite, zero, negative, or excessive timeout
- **THEN** the SDK rejects the configuration

### Requirement: Redirects are blocked by default

The system SHALL block automatic redirects for SDK network calls so credentials and bearer tokens cannot be forwarded to an unintended destination.

#### Scenario: Redirect response does not reach destination

- **WHEN** a server responds with a redirect
- **THEN** the SDK does not follow it and the destination receives no credentials

### Requirement: Cancellation propagates end to end

The system SHALL propagate caller cancellation signals through authentication, request execution, retries, and response body reads.

#### Scenario: Cancelled request stops further I/O

- **WHEN** a caller cancels an in-flight operation
- **THEN** the SDK stops subsequent requests and reads

#### Scenario: Cancelled mutation remains reconcilable

- **WHEN** a mutation is cancelled after the request may have reached the server
- **THEN** the caller can reconcile the same document key without replaying the mutation

### Requirement: Timeout budgets are hierarchical and configurable

The system SHALL support per-request, authentication, and total operation budgets. Each SHALL have a safe default and SHALL allow override within validated bounds.

#### Scenario: Total budget can be shorter than request budget

- **WHEN** an operation timeout is configured below a request timeout
- **THEN** the operation stops when its total budget expires

#### Scenario: Override is accepted within bounds

- **WHEN** a caller provides a valid custom timeout
- **THEN** the SDK uses it instead of the default
