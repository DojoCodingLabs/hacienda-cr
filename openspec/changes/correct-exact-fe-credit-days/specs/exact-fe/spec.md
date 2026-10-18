## ADDED Requirements

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
