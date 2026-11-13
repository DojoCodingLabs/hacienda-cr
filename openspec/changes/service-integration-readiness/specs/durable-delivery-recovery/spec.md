## Purpose

Provide the contracts and helpers a service needs to recover invoice delivery durably across processes and hosts, including reconciliation, callback validation, and classification of uncertain outcomes, while keeping the SDK database-agnostic.

## ADDED Requirements

### Requirement: Reconciliation is keyed by document clave

The system SHALL provide helpers to reconcile a document by its exact clave after an uncertain or interrupted submission. Reconciliation SHALL query status by that clave and SHALL NOT generate a new document or consecutive.

#### Scenario: Interrupted submission is reconciled by clave

- **WHEN** a submission is interrupted after the request may have reached the server
- **THEN** the service can query the original clave and update local state

#### Scenario: Reconciliation does not create a new document

- **WHEN** reconciliation is performed
- **THEN** no new clave or consecutive is allocated

### Requirement: Uncertain outcomes are classified explicitly

The system SHALL classify submission outcomes as success, rejected, link-down, or ambiguous, and SHALL distinguish an ambiguous outcome from a confirmed rejection.

#### Scenario: Ambiguous outcome requires reconciliation

- **WHEN** a mutation times out or the response is lost
- **THEN** the outcome is classified as ambiguous rather than rejected

#### Scenario: Confirmed rejection is terminal

- **WHEN** Hacienda returns a rejection
- **THEN** the outcome is classified as rejected and is terminal

### Requirement: Idempotency is owned by the service operation

The system SHALL document that Hacienda has no operation-level idempotency key. The service SHALL enforce idempotency through a unique operation intent and a single persisted document per intent.

#### Scenario: Repeated event does not create a second document

- **WHEN** the same operation event is processed twice
- **THEN** the service reuses the existing document instead of creating another

#### Scenario: Same clave binds to the same document bytes

- **WHEN** a submission is retried with a different document body for the same clave
- **THEN** the system rejects the mismatch

### Requirement: Callback payloads are parsed and validated

The system SHALL expose a parser and validator for Hacienda callback payloads, including clave, status, date, and decoded response XML, and SHALL reject malformed payloads.

#### Scenario: Valid callback payload is parsed

- **WHEN** a valid callback payload is received
- **THEN** the system returns the clave, status, date, and decoded response XML

#### Scenario: Malformed callback payload is rejected

- **WHEN** a callback payload is missing required fields or has invalid values
- **THEN** the system rejects it with a validation error

### Requirement: Callback transport envelope is parsed before XML validation

The system SHALL parse the callback HTTP body as JSON with `clave`, `fecha`, `indEstado`, and `respuestaXml`. It SHALL decode `respuestaXml` from Base64 and validate the resulting XML against `MensajeHacienda`.

#### Scenario: Valid JSON envelope is parsed

- **WHEN** a callback body contains the required JSON fields
- **THEN** the system returns the clave, status, date, and decoded response XML

#### Scenario: Missing envelope field is rejected

- **WHEN** a callback body lacks `respuestaXml`
- **THEN** the system rejects it with a validation error

### Requirement: Callback receiver contract is documented

The system SHALL document that a callback endpoint must respond HTTP 200 to a POST with application/json, that Hacienda retries three times, and that failure to respond leaves the response available only through the query API.

#### Scenario: Non-200 response triggers retry

- **WHEN** a callback endpoint does not return HTTP 200
- **THEN** Hacienda retries up to three times

#### Scenario: Repeated callback is safe

- **WHEN** the same callback is delivered more than once
- **THEN** the service can process it idempotently by clave

### Requirement: Document store remains pluggable

The system SHALL keep the document store as an interface and SHALL NOT depend on a specific database. A service SHALL be able to provide its own durable implementation.

#### Scenario: Custom store is used

- **WHEN** a service provides its own document store
- **THEN** the SDK uses it and does not write to the default file store

#### Scenario: Store disappearance is surfaced

- **WHEN** a persisted document disappears during an operation
- **THEN** the SDK surfaces an explicit error instead of silently recreating it

### Requirement: Legal deadlines remain explicit

The system SHALL expose situation, obligation, and deadline information with each persisted document so a service can evaluate expiry in business days and mark documents as expired.

#### Scenario: Expired document is marked

- **WHEN** a document's business-day deadline has passed
- **THEN** the delivery state becomes expired and is not treated as a send failure
