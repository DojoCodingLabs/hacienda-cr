## ADDED Requirements

### Requirement: Family contract scope is explicit

The SDK SHALL define an additive exact domestic V1 family contract covering FE,
ND, partial NC, rejected-FE replacement, TE, FEC, REP and recipient lifecycle
facts. It SHALL preserve retained 0.9 read-only custody, follow current validation as
published in 0.10.0 and later, preserve total-NC behavior and preserve legacy
Number APIs.

#### Scenario: Historical behavior remains unchanged

- **GIVEN** existing 0.9 current/retained FE, total-NC and legacy Number behavior
- **WHEN** the exact domestic V1 family contract is implemented
- **THEN** existing 0.9 current/retained FE outputs, total-NC behavior and
  legacy Number APIs remain unchanged

### Requirement: Family slices require independent verification

Each family slice SHALL be independently reviewed and verified with exact decimal
arithmetic, exact JSON/XML boundaries, native XSD validation, synthetic
signing/response tests and fresh packed consumers before it is treated as ready.

#### Scenario: Unverified slice blocks readiness

- **GIVEN** a family slice
- **WHEN** it lacks independent review or verification
- **THEN** the family contract SHALL not treat that slice as ready for release

### Requirement: Current and retained FE validation are distinguished

The family contract SHALL distinguish current exact FE business validation from
retained 0.9 source custody. It SHALL not silently tighten historical source
bytes, rewrite retained originals or infer fiscal compliance from native XSD
minima alone.

#### Scenario: Retained source is not silently changed

- **GIVEN** current FE business validation is tightened
- **WHEN** the family contract is applied
- **THEN** historical source bytes, producer tuples and retained custody remain
  unchanged

### Requirement: Current FE validation references the published contract

The family contract SHALL treat native-bounded names and positive supplied
payment allocations as already defined by `current-fe-input`. This umbrella
SHALL reference that published contract instead of duplicating its requirements.

#### Scenario: Published contract is the source of truth

- **GIVEN** the published `current-fe-input` contract
- **WHEN** this family contract needs name or payment allocation rules
- **THEN** it SHALL reference `current-fe-input` rather than restating them

### Requirement: REP requires an official monetary oracle

REP SHALL remain unavailable until an official worked example or competent
written rule resolves its monetary mapping. Native XSD validity alone SHALL NOT
select a REP calculation convention.

#### Scenario: Missing oracle blocks REP

- **GIVEN** no official REP monetary oracle is available
- **WHEN** REP readiness is evaluated
- **THEN** the family contract SHALL not present REP as ready

### Requirement: Recipient lifecycle facts remain distinct

Recipient confirmation SHALL keep source clave, confirmation consecutive and
Hacienda outcome as distinct facts. It SHALL NOT infer a composite confirmation
endpoint or treat source validity as confirmation acceptance.

#### Scenario: Source validity is not confirmation acceptance

- **GIVEN** a structurally valid source FE
- **WHEN** recipient confirmation is evaluated
- **THEN** recipient confirmation acceptance SHALL still require its own
  authoritative status and consecutive

### Requirement: Linked release closure is explicit

The family SHALL use coherent linked releases. A release containing a subset of
ready slices SHALL NOT be presented as closing all hacienda-cr #85 gates. REP SHALL remain
independently blocked and SHALL NOT make unrelated ready slices unreleasable.
Release evidence SHALL include the reviewed commit, independent review reference,
verification counts and fresh packed consumer results.

#### Scenario: Subset release is not full closure

- **GIVEN** a linked release contains only a subset of required slices
- **WHEN** it is published
- **THEN** it SHALL be recorded as partial closure and issue hacienda-cr #85 SHALL remain
  open until all required gates pass

### Requirement: Adapter and installed-consumer evidence is required

The family contract SHALL require adapter, installed-consumer and migration
evidence before a linked release is treated as ready. CLI and MCP SHALL NOT
convert exact input to Number. Unsupported adapter paths SHALL fail explicitly
instead of being silently normalized or dropped. This evidence SHALL be part of
the release evidence set.

#### Scenario: Exact input is not converted to Number

- **GIVEN** exact family input consumed through CLI or MCP
- **WHEN** the adapter path is exercised
- **THEN** the exact input SHALL remain exact through the adapter, and any
  unsupported path SHALL fail explicitly rather than converting to Number

### Requirement: SDK #69 and app acceptance are explicit closure gates

The final hacienda-cr #85 closure release SHALL require SDK #69 to be resolved
or its risk explicitly accepted, and SHALL require evidence of application-level
acceptance. These gates SHALL NOT be treated as merely "separate" tracking
items; each SHALL have a named owner and a verifiable closure condition. If
either remains open, hacienda-cr #85 SHALL remain open and the release SHALL be
recorded as partial closure.

#### Scenario: Open #69 keeps #85 open

- **GIVEN** SDK #69 remains unresolved and unaccepted
- **WHEN** final hacienda-cr #85 closure is evaluated
- **THEN** hacienda-cr #85 SHALL remain open and any release SHALL be recorded
  as partial closure
