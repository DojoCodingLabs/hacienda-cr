## Context

Issue hacienda-cr #85 is an umbrella over focused exact-family source slices. Several slices
are already merged and published through 0.13.0. Remaining gaps include REP,
recipient transport/correlation, special FEC and used-goods review, and
operational acceptance. Current FE native name and positive payment allocation
boundaries are already published in 0.10.0+. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Define the closure criteria for the exact domestic V1 family contract.
- Keep source slices additive and independently verifiable.
- Preserve historical bytes, producer tuples and legacy APIs.
- Gate release on independent review and full verification.

**Non-Goals:**

- Fiscal activation, live Hacienda calls or production deployment.
- Selecting an unreviewed REP monetary convention.
- Rewriting retained 0.9 source custody.
- App adoption or UI implementation.

## Decisions

- Use one umbrella change to track closure criteria, while implementation remains
  in focused source changes and PRs.
- Keep REP blocked until an official worked example or competent written rule
  resolves its monetary mapping.
- Keep recipient confirmation facts distinct: source clave, confirmation
  consecutive and Hacienda outcome.
- Treat current FE business validation as a reviewed boundary separate from
  native XSD validity and retained source custody.
- Require positive supplied payment allocations and exact reconciliation without
  inferring cash received or REP eligibility.
- Publish intermediate linked releases from ready slices as partial closure,
  leaving issue hacienda-cr #85 open.
- Publish the final hacienda-cr #85 closure release only after all required slices pass
  independent review and full verification.
- Track REP, recipient, special FEC, used-goods and operational acceptance in
  their focused changes rather than reimplementing them here.
- Require adapter, installed-consumer and migration evidence before release;
  CLI and MCP SHALL NOT convert exact input to Number, and unsupported adapter
  paths SHALL fail explicitly.
- Treat SDK #69 and application acceptance as explicit closure gates for the
  final hacienda-cr #85 release, with named owner and verifiable condition;
  otherwise record the release as partial closure.

## Risks / Trade-offs

- [Risk] Umbrella scope can be mistaken for implementation authority.
  → Mitigation: keep implementation in focused source changes and PRs.
- [Risk] REP remains blocked by missing official oracle.
  → Mitigation: explicitly keep REP out of release until oracle exists.
- [Risk] Current FE validation could silently change retained behavior.
  → Mitigation: require reviewed current-versus-retained boundary and preserve
  historical bytes.

## Migration Plan

No runtime migration is included. Future implementation slices must preserve
existing APIs and retained source custody, then update consumer adoption only
after release.

## Open Questions

None. Remaining unknowns are tracked as explicit gates, not design decisions.
