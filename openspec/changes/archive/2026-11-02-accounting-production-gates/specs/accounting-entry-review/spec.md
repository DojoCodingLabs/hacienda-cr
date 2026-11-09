## Purpose

Define a bounded accounting review gate that validates only accounting entries derived from synthetic invoices in XML, without blocking technical tests or development.

## ADDED Requirements

### Requirement: Accounting review is limited to accounting entries

The system SHALL limit accountant review to accounting entries, tax mapping, and reconciliation artifacts. It SHALL NOT require review of transport, XSD, or signing behavior.

#### Scenario: Accountant reviews entries only

- **WHEN** the accounting review gate runs
- **THEN** it validates accounting entries and tax mapping, not XML transport or signature

### Requirement: Synthetic invoices are the review input

The accounting review gate SHALL use synthetic invoices with no real customer or commercial data.

#### Scenario: Synthetic data is used

- **WHEN** accounting review evidence is produced
- **THEN** all invoices are synthetic and contain no real customer data

### Requirement: XML is the reviewed artifact

The accounting review gate SHALL review XML documents and their derived entries. It SHALL NOT require PDF or graphical representation.

#### Scenario: XML-only review

- **WHEN** accounting review evidence is produced
- **THEN** the reviewed artifacts are XML plus accounting entries

### Requirement: Technical tests remain unblocked

The system SHALL allow unit, integration, and mocked transport tests to run without accountant approval.

#### Scenario: CI runs without accountant sign-off

- **WHEN** `pnpm verify` runs
- **THEN** it does not require accountant approval
