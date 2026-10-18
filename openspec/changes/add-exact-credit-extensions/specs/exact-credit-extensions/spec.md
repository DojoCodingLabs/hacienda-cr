## ADDED Requirements

### Requirement: Partial NC source is distinct from total cancellation

The SDK SHALL provide a reviewed positive exact partial amount-correction source
bound to immutable original FE facts and own NC 03 identity. It SHALL NOT infer
fresh remaining credit, refunds or original acceptance from source arithmetic.

#### Scenario: Partial credit preserves the original

- **WHEN** a reviewed partial amount correction selects explicit correlated original line facts
- **THEN** new NC 03 XML SHALL calculate only the positive credit and reference the unchanged original FE with amount-correction02

### Requirement: Hacienda-rejected FE replacement is a new document

The SDK SHALL distinguish a Hacienda-rejected document reference from a valid
accepted-source correction or recipient rejection. It SHALL NOT issue NC/ND to
cancel a Hacienda-rejected source or require that invalid source to parse as a
valid current FE input.

#### Scenario: Replacement receives a new identity

- **WHEN** independently verified rejected source material authorizes a reviewed replacement
- **THEN** a new current FE SHALL carry rejected-document type 10/replacement16 and exact retained reference identity/date with a fresh consecutive

#### Scenario: Unknown or recipient rejection is not institutional rejection

- **WHEN** the caller only has pending/unknown/raw JSON or a recipient rejection
- **THEN** SDK source structure SHALL NOT be presented as verified replacement authority
