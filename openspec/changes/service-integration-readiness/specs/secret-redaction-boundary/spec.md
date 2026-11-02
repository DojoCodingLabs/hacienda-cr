## Purpose

Ensure secrets such as passwords, PINs, tokens, and private keys cannot escape through SDK errors, logs, CLI JSON output, or MCP responses, including when external services return hostile messages.

## ADDED Requirements

### Requirement: Errors are sanitized at creation

The system SHALL sanitize error messages and structured error data when SDK errors are created. Sanitization SHALL cover password, PIN, token, authorization, cookie, private key, and configured environment secrets.

#### Scenario: Network error message does not contain bearer token

- **WHEN** a request fails with an error containing a bearer token
- **THEN** the resulting SDK error message does not contain the token

#### Scenario: HTTP error data is sanitized

- **WHEN** an HTTP error response includes secret-like values
- **THEN** the error data exposed by the SDK does not contain those values

#### Scenario: Auth error does not expose password

- **WHEN** authentication fails
- **THEN** the auth error does not contain the submitted password

### Requirement: External messages are treated as untrusted

The system SHALL sanitize messages received from external services before including them in errors, logs, or adapter responses.

#### Scenario: Hostile error message is redacted

- **WHEN** an external service returns an error message containing a secret
- **THEN** the SDK error and log output do not contain that secret

#### Scenario: CLI JSON failure output is sanitized

- **WHEN** a CLI command fails due to an external error
- **THEN** the JSON failure output contains no secrets

#### Scenario: MCP error response is sanitized

- **WHEN** an MCP tool fails due to an external error
- **THEN** the error returned to the MCP client contains no secrets

### Requirement: Redaction does not mutate caller data

The system SHALL produce redacted copies for diagnostics and SHALL NOT mutate the original error or data objects passed by callers.

#### Scenario: Original error remains unchanged after logging

- **WHEN** an error containing secrets is logged
- **THEN** the original error object retains its original values

### Requirement: Secret coverage is testable

The system SHALL provide tests that assert redaction for environment-configured secrets, labeled secrets, auth schemes, and private key blocks across text and JSON output.

#### Scenario: Configured environment secret is redacted

- **WHEN** an environment secret appears in a logged message
- **THEN** the log output replaces it with a redaction marker
