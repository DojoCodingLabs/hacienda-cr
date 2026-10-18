## ADDED Requirements

### Requirement: Explicit non-subject used personal goods purchase

The SDK SHALL provide a separately named source contract requiring actual supplier06,
buyer-owned08 identity, condition13, goods CABYS0–4, actual supporting references,
IVA01/tariff11 and exact positive monetary inputs. It SHALL NOT infer qualification
from identity, claim tax entitlement or calculate a future resale's margin/factor.

#### Scenario: Ordinary discount and split allocation

- **WHEN** independently qualified goods have ordinary commercial discounts
- **THEN** the source SHALL preserve gross non-subject amounts, deduct quantized
  discounts exactly once, and require positive allocations summing to the net total

#### Scenario: Unsupported regime or fabricated authority

- **WHEN** input contains services, gifts, bonuses, taxable/exempt/factor overrides,
  invented qualification flags or source totals
- **THEN** the source SHALL reject without coercion or silent defaulting

### Requirement: Native and historical boundaries

Existing APIs and output SHALL remain unchanged. Schema/signature structure checks
SHALL NOT establish qualification, acceptance or response correlation.

#### Scenario: Source validation

- **WHEN** a supported source is built
- **THEN** both unchanged native XSD generations and independent Decimal arithmetic
  SHALL agree with its exact fields and original source SHALL remain unchanged
