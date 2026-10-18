## ADDED Requirements

### Requirement: Exact ordinary FE preserves decimal values end to end

The SDK SHALL provide an additive named ordinary domestic FE API using decimal
strings for supported financial fields, scaled BigInt arithmetic and exact XML
text. It SHALL preserve legacy number APIs and reject unsupported fiscal facts,
implicit numeric coercion, schema overprecision and computed overflow.

#### Scenario: Maximum valid monetary value survives JSON and XML

- **GIVEN** a valid ordinary FE whose computed total is9999999999999.99999
- **WHEN** its source is serialized to JSON, parsed, calculated and emitted
- **THEN** the total remains the same exact decimal text without Number conversion
- **AND** the XML conforms to the vendored official2026 FE XSD

#### Scenario: Independent arithmetic and explicit unsupported boundaries

- **GIVEN** ordinary13% FE lines with explicit service/goods, discounts and payments
- **WHEN** the exact API calculates the invoice
- **THEN** its five-decimal half-up results agree with an independent Decimal oracle
- **AND** unsupported regimes, wrong payment allocation and overflow are rejected

#### Scenario: Special or free transactions are not ordinary IVA13

- **GIVEN** a special transaction code02–13, gift/bonus discount01–03, zero price/gross/net or conflicting CABYS class
- **WHEN** the named exact ordinary API validates or calculates the line
- **THEN** it rejects the unsupported facts before XML
- **AND** transaction omission stays omitted while explicit normal-sale01 remains supported
