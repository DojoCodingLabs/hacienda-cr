# exact-fe Specification

## Purpose

TBD - created by archiving change correct-exact-fe-credit-days. Update Purpose after archive.

## Requirements

### Requirement: Current exact FE credit days follow the reviewed business rule

The current exact FE schema, calculator and XML builder SHALL require a positive decimal-digit term of one to five digits for sale conditions 02 and 10. Any supplied term SHALL be positive. Valid leading-zero lexemes SHALL survive unchanged. The implementation SHALL NOT infer 90 days, normalize through Number or treat permissive native XSD as current business readiness.

#### Scenario: Invalid or absent current term

- **WHEN** a current 02/10 source omits days or supplies zero, all-zero, negative, fractional or over-width days
- **THEN** shared current validation and exact calculation/XML fail before output
- **AND** valid terms 1, 00001 and 99999 retain the exact original lexeme through JSON/XML.

### Requirement: Historical exact arithmetic remains separate from emission authority

The SDK SHALL expose a separately named read-only retained exact FE schema/calculator preserving the former 0.6–0.8 term shape. It SHALL reuse bounded exact arithmetic and SHALL NOT add a retained XML/signing/POST builder or a permissive flag on the current APIs. Consumers SHALL independently bind the retained producer and original bytes; legacy Number APIs SHALL remain unchanged without being declared current business-compliance validators.

#### Scenario: Historically constructed invalid term

- **WHEN** actual published 0.8 source and original bytes contain zero 02 days or absent 10 days
- **THEN** retained decoding/calculation preserves those facts and unchanged bytes under independently bound custody
- **AND** current exact construction still rejects them
- **AND** structural XSD/signature presence does not establish fiscal acceptance or authorize another emission.

### Requirement: Current exact FE respects document-family sale conditions

Current exact FE schema, calculator and XML builder SHALL reject REP-only sale conditions 09/11 and FEC-only 13. Other valid FE conditions SHALL retain their existing behavior. Read-only historical decoding/calculation and legacy Number APIs SHALL retain their prior behavior without granting current issuance authority.

#### Scenario: Wrong-family current FE source

- **WHEN** a current exact FE supplies sale condition 09, 11 or 13
- **THEN** current validation, arithmetic and XML generation fail before output
- **AND** independently bound historical source-only calculation remains available without rewriting facts or exposing a retained builder.

### Requirement: Exact ordinary FE preserves decimal values end to end

The SDK SHALL provide an additive named ordinary domestic FE API using decimal
strings for supported financial fields, scaled BigInt arithmetic and exact XML
text. Its accepted fiscal scope SHALL be IVA codigo 01, tarifa 08 and tasa 13%;
any other codigo, tarifa or impuesto SHALL be rejected as an unsupported fiscal
fact. It SHALL preserve legacy number APIs and reject unsupported fiscal facts,
implicit numeric coercion, schema overprecision and computed overflow.

#### Scenario: Maximum valid monetary value survives JSON and XML

- **GIVEN** a valid ordinary FE whose computed total is 9999999999999.99999
- **WHEN** its source is serialized to JSON, parsed, calculated and emitted
- **THEN** the total remains the same exact decimal text without Number conversion
- **AND** the XML conforms to the vendored official 2026 FE XSD

#### Scenario: Independent arithmetic and explicit unsupported boundaries

- **GIVEN** ordinary 13% FE lines with explicit service/goods, discounts and payments
- **WHEN** the exact API calculates the invoice
- **THEN** its five-decimal half-up results agree with an independent Decimal oracle
- **AND** unsupported regimes, wrong payment allocation and overflow are rejected

#### Scenario: Special or free transactions are not ordinary IVA13

- **GIVEN** a special transaction code 02–13, gift/bonus discount 01–03, zero price/gross/net or conflicting CABYS class
- **WHEN** the named exact ordinary API validates or calculates the line
- **THEN** it rejects the unsupported facts before XML
- **AND** transaction omission stays omitted while explicit normal-sale 01 remains supported
