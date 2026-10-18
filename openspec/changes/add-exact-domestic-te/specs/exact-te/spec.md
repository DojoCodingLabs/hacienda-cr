# Exact TE

## ADDED Requirements

### Requirement: Exact source-only ordinary TE

The SDK SHALL accept a strict named ordinary domestic TE source using decimal text, calculate all derived amounts without Number conversion and emit genuine TE04 XML. An absent receiver SHALL remain absent; an actual receiver SHALL preserve its actual permitted fields with optional identification. It SHALL reject dummy/unknown FE-only fields and unsupported fiscal cases rather than silently discard them.

#### Scenario: An anonymous TE retains exact monetary text

- **GIVEN** an ordinary TE source with no receiver and maximum representable exact total
- **WHEN** the SDK parses, calculates and builds its XML
- **THEN** the genuine TE root and identity agree, receiver remains absent and exact JSON/XML text and independent decimal/native results agree

#### Scenario: Actual receiver and current credit terms

- **GIVEN** a valid actual named receiver, optionally identified, and a family-applicable condition
- **WHEN** the source has positive explicit days for 02/10
- **THEN** the SDK preserves source identity and credit-day lexemes without inventing a receiver, bank payment or legal eligibility

#### Scenario: Existing source custody remains compatible

- **GIVEN** current FE, retained historical FE and total NC contracts
- **WHEN** their unchanged wrappers invoke the extracted monetary kernel
- **THEN** existing output/errors and read-only retention boundaries remain unchanged and no historical signing authority is introduced
