## ADDED Requirements

### Requirement: Special FEC source distinguishes identity from tax treatment

Special FEC source SHALL preserve actual supplier/buyer identities and supporting
evidence. Supplier 05 SHALL require its actual foreign-provider reference and
address; supplier 06 SHALL require used-goods sale condition 13. Neither supplier
identity SHALL select or attest VAT liability, credit, rate or period by itself.

#### Scenario: Native-valid tax hypotheses do not establish eligibility

- WHEN mutually incompatible special-FEC tax hypotheses pass structural native XSD
- THEN the system SHALL retain the tax-classification requirement as unresolved
- AND SHALL NOT expose an unreviewed calculator or imply real fiscal acceptance

#### Scenario: Original seller and buyer roles remain distinct

- WHEN a special purchase source is prepared
- THEN the actual supplier SHALL remain XML Emisor and the buyer Receptor
- AND the buyer SHALL own its 08 key/signing authority without invented party facts
