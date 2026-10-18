# Exact ordinary ND

## ADDED Requirements

### Requirement: Explicit positive correction of one ordinary FE

The SDK SHALL validate one ordinary FE source and explicit FE 01/reference 02 identity, and SHALL calculate only independently supplied positive incremental lines using decimal text. It SHALL preserve original facts and full timestamp precision, bind each incremental line to an existing original classification/unit/commercial tuple at most once, and preserve caller order with sequential ND output. It SHALL reject unrelated/duplicate references, unknown authority fields and unsupported cases.

#### Scenario: Delta is not a repeated sale

- **GIVEN** a valid ordinary source whose original total differs from a new incremental amount
- **WHEN** the caller supplies exact positive delta facts and matching independent allocation
- **THEN** genuine ND02 XML carries only the delta, unchanged source reference/header facts and independently reconciled native/decimal values

#### Scenario: Correspondence and chronology fail closed

- **GIVEN** a foreign/missing original line, wrong reference/family/identity or ND timestamp earlier by a submillisecond fraction
- **WHEN** the source is validated or built
- **THEN** the operation fails without rewriting source facts or inventing an eligibility clock

#### Scenario: Source-only output does not establish legal authority

- **GIVEN** reproducible SDK source facts without a trusted current legal-age decision
- **WHEN** arithmetic/XML succeeds
- **THEN** the caller still must enforce actual source authority and issuance-time eligibility, and no app activation or historical signing authority follows
