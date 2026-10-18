## ADDED Requirements

### Requirement: Recipient source preserves the original invoice facts

The SDK SHALL bind seller, buyer, clave and complete exact original tax/total to
an independently validated ordinary FE. It SHALL require the actual buyer-owned
05/06/07 consecutive corresponding to message 1/2/3. Partial acceptance SHALL NOT
replace original full totals with accepted portions. Explicit tax decisions
SHALL NOT be inferred from a message or treated as entitlement.

#### Scenario: Partial acceptance retains complete original totals

- **WHEN** a caller selects partial acceptance with actual reason and own 06 consecutive
- **THEN** the producer SHALL preserve full source tax/total and original clave while emitting the separate confirmation date

### Requirement: Source XML is separate from outcome authority

Native XML validity SHALL NOT establish institutionally accepted source or
confirmation. The SDK SHALL NOT identify a recipient outcome solely using the
original FE clave or generic response verification.

#### Scenario: Original acceptance cannot settle a recipient message

- **WHEN** an authentic original invoice response contains no recipient consecutive
- **THEN** it SHALL NOT be presented as recipient-message outcome or safe recovery evidence
