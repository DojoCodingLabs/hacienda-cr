# reviewed-signing-policy Specification

## Purpose

TBD - created by archiving change align-a2-runtime-policy. Update Purpose after archive.

## Requirements

### Requirement: Emit the reviewed policy bytes and identifier

The SDK SHALL emit the exact reviewed official policy URL, SHA256 algorithm and Base64 SHA256 of the retained policy PDF. It SHALL use the library's precomputed digest contract rather than hashing an identifier in its place.

#### Scenario: Independent signature verification

- **WHEN** a synthetic offline FE is signed
- **THEN** its policy fields match the primary-source PDF and URL
- **AND** independent libxml2/OpenSSL checks verify document and SignedProperties references and RSA signature
- **AND** altered document, policy or signature bytes fail verification.

### Requirement: Keep catalog and migration scope honest

The SDK SHALL reject exoneration 12, preserve exact official Ohm bytes and the reviewed fiscal identities. Existing deprecated document aliases SHALL remain until a separately reviewed removal.

#### Scenario: Safe bounded A2 integration

- **WHEN** the focused A2 change is installed from its package artifacts
- **THEN** catalog and policy behavior match the reviewed source
- **AND** numeric DTOs and existing identity/rate validation guards remain unchanged
- **AND** package installation alone does not establish Hacienda acceptance or institutional trust.
