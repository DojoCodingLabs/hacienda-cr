## Purpose

Defines the research/design boundary for an exact, original-bound REP producer. It
records the reviewed tax-first recovery rule, unresolved XML oracle, exact
chronology and currency limits, and the named cases that any future producer must
satisfy. It does not implement or enable REP.

## ADDED Requirements

### Requirement: Original-bound exact REP source

The SDK SHALL derive the complete REP from one explicit reviewed source with its
own typeDoc 10 identity, unchanged original parties/reference, exact payment/currency and
separate fiscal-regime qualification. It SHALL NOT equate cash receipt or native
validity with eligibility, tax liability, customer credit or a second sale. It
SHALL NOT accept authority flags such as `eligible: true` or `accepted: true` as
substitutes for reviewed source evidence.

#### Scenario: Ordinary credit receipt is not REP qualification

- **GIVEN** an ordinary 02 invoice or an unverified promise of payment
- **WHEN** a caller requests current REP production
- **THEN** the source is rejected without fabricating typeDoc 08/10 qualification or cash

#### Scenario: Partial payment does not infer a percentage

- **GIVEN** an eligible deferred-tax invoice and a verified partial payment
- **WHEN** the source allocates recovered tax and maps the REP
- **THEN** the reviewed tax-first register and complete XML oracle are applied
  separately, rather than an arbitrary gross-payment proportional formula

### Requirement: Named REP cases

Any future REP producer SHALL be bound to the named reviewed cases
`REP-state-service-fe-iva13-v1` and `REP-deferred-fe-iva13-v1`. It SHALL use
reference code 17 only in ReciboElectronicoPago. A generic REP percentage mode
SHALL NOT satisfy this specification.

#### Scenario: Named case is required

- **GIVEN** a caller requests REP production without a named reviewed case
- **WHEN** the source is evaluated
- **THEN** production is rejected rather than falling back to a generic
  percentage allocation

#### Scenario: Reference code 17 is REP-only

- **GIVEN** reference code 17 is used outside ReciboElectronicoPago
- **WHEN** validation runs
- **THEN** the document is rejected

### Requirement: Target schema generation

The reviewed current case SHALL target the 2026 schema generation. The 2024
generation is explicitly not supported for reference code 17 and SHALL NOT be
silently rewritten to code 04.

#### Scenario: 2024 generation cannot carry reference 17

- **GIVEN** the 2024 schema generation is used with reference code 17
- **WHEN** native validation runs
- **THEN** validation fails and the implementation does not rewrite the reference
  to code 04

### Requirement: Complete reviewed monetary projection

The public source/schema/calculator/XML contracts SHALL use bounded exact text
and a single independently reviewed monetary mapping. Native conformance SHALL
NOT choose between contradictory line/summary values.

#### Scenario: Missing current XML oracle

- **GIVEN** multiple contradictory candidates pass the unchanged native schema
- **WHEN** current fiscal readiness is evaluated
- **THEN** production remains unavailable until the precise projection is
  independently reviewed, without a permissive caller-selected formula

#### Scenario: Tax deadline without customer cash

- **GIVEN** deferred IVA becomes payable while no customer cash was received
- **WHEN** the application records the tax obligation
- **THEN** it does not invent a receipt, zero-value REP or second sale, and later
  cash does not automatically create a duplicate tax debit

### Requirement: Exact chronology

REP production SHALL require the complete payment chronology: original emission
time, payment time, and REP emission time. Fractional seconds and offsets SHALL be
preserved. The system SHALL NOT use `Date.now()`, a local calendar, or any
invented clock value to establish eligibility or deadlines.

#### Scenario: Incomplete chronology is rejected

- **GIVEN** a payment or emission time is missing or reduced to date-only
- **WHEN** the source is evaluated
- **THEN** production is rejected

### Requirement: Currency boundary

REP production SHALL start with CRC same-currency cases. USD and any
cross-currency case SHALL remain blocked until an independently approved exchange
rule exists.

#### Scenario: Cross-currency REP is blocked

- **GIVEN** a payment in USD or a mixed-currency allocation
- **WHEN** REP production is requested
- **THEN** it is rejected until the exchange rule is approved

### Requirement: Immutable cumulative payment authority

The application SHALL bind each exact payment/allocation to current scoped
source authority and one durable fiscal identity. Cash, fiscal outcomes,
recovered/declared tax, customer credit and delivery SHALL remain separate.

Production SHALL be blocked when any of the following is true:

- REP is pending or unknown;
- cash is reversed or not verified;
- remaining tax is insufficient;
- unresolved NC/ND effects exist.

#### Scenario: Unknown prior attempt

- **GIVEN** a prior payment's submission acknowledgement is unknown
- **WHEN** another attempt is requested
- **THEN** no new identity/allocation is issued until same-key reconciliation,
  and retained first bytes never authorize re-signing or duplicate POST

#### Scenario: Blocking condition prevents allocation

- **GIVEN** a blocking condition listed above
- **WHEN** allocation is requested
- **THEN** no allocation or REP is created

### Requirement: Expected recovery cases

The reviewed tax-first recovery rule SHALL be recorded as the following expected
cases: 5/5/3/100. These values are evidence of the reviewed rule and SHALL be
preserved in the spec, not only in external research.

#### Scenario: Recovery values are preserved

- **GIVEN** the reviewed tax-first rule is cited
- **WHEN** the spec is archived or read independently
- **THEN** the expected case values 5/5/3/100 remain available without reading
  external research
