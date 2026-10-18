## ADDED Requirements

### Requirement: Distinct exact domestic purchase source

The SDK SHALL provide a named bounded ordinary IVA13 FEC source that retains the
actual supplier and buyer roles, requires a buyer-owned08 identity and explicit
supporting references, and derives monetary totals without Number conversion.
It SHALL NOT infer supplier eligibility or tax/exigibility from XSD conformance.

#### Scenario: Actual supplier and buyer remain distinct

- **WHEN** a reviewed ordinary domestic purchase source includes actual supplier/buyer data, required buyer activity, valid08 identity and supporting references
- **THEN** exact calculation and genuine FEC XML SHALL preserve those facts, bind identity to the buyer and exclude FE-only native line fields

#### Scenario: Unsupported special FEC case

- **WHEN** the first named ordinary case receives supplier05, supplier06/condition13, foreign, deferred or nonordinary tax facts
- **THEN** it SHALL reject instead of fabricating parties or inferring a tax classification

#### Scenario: Missing evidence or wrong own identity

- **WHEN** buyer activity/reference is absent or the own clave binds the supplier instead of the buyer
- **THEN** input/calculation/building SHALL reject before signing or transport
