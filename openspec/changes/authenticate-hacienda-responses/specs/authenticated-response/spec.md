## ADDED Requirements

### Requirement: Authenticate exact response context

The SDK SHALL return a terminal response only after validating the bounded
MensajeHacienda schema, entire root reference and native RSA-SHA256 signature
under an explicit reviewed current leaf pin, with exact expected clave, parties
and decimal total. Embedded KeyInfo SHALL NOT authorize a signer.

#### Scenario: Correct independently signed synthetic response

- **WHEN** a schema-conforming response is signed by an explicitly pinned valid synthetic leaf and all frozen expected metadata agree
- **THEN** the verifier returns exact metadata and accepted/rejected without a network call or monetary rounding

#### Scenario: Tampered or untrusted response

- **WHEN** bytes/signature/context differ, a signer is untrusted/expired, or XML has wrapping, duplicate IDs, hostile declarations, external references or unsupported algorithms
- **THEN** the verifier throws a bounded typed error without source diagnostics and the application retains unverified/unknown evidence

### Requirement: Preserve trust provenance boundaries

The SDK SHALL document leaf-pin scope separately from PKIX/revocation policy,
reviewed institutional provenance, transport status and live Hacienda acceptance.

#### Scenario: Synthetic tests pass

- **WHEN** local native/oracle and installed-package fixtures pass with synthetic pins
- **THEN** the result SHALL NOT claim institutional production authority or real fiscal acceptance
