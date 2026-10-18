## ADDED Requirements

### Requirement: Original-bound exact REP source

The SDK SHALL derive the complete REP from one explicit reviewed source with its
own 10 identity, unchanged original parties/reference, exact payment/currency and
separate fiscal-regime qualification. It SHALL NOT equate cash receipt or native
validity with eligibility, tax liability, customer credit or a second sale.

#### Scenario: Ordinary credit receipt is not REP qualification

- **GIVEN** an ordinary 02 invoice or an unverified promise of payment
- **WHEN** a caller requests current REP production
- **THEN** the source is rejected without fabricating 08/10 qualification or cash

#### Scenario: Partial payment does not infer a percentage

- **GIVEN** an eligible deferred-tax invoice and a verified partial payment
- **WHEN** the source allocates recovered tax and maps the REP
- **THEN** the reviewed tax-first register and complete XML oracle are applied
  separately, rather than an arbitrary gross-payment proportional formula

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

### Requirement: Immutable cumulative payment authority

The application SHALL bind each exact payment/allocation to current scoped
source authority and one durable fiscal identity. Cash, fiscal outcomes,
recovered/declared tax, customer credit and delivery SHALL remain separate.

#### Scenario: Unknown prior attempt

- **GIVEN** a prior payment's submission acknowledgement is unknown
- **WHEN** another attempt is requested
- **THEN** no new identity/allocation is issued until same-key reconciliation,
  and retained first bytes never authorize re-signing or duplicate POST
