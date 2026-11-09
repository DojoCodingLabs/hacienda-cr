## Why

Issue hacienda-cr #85 tracks the remaining work to close the exact domestic V1 family
contract. Several focused source slices are already merged and published, but
closure still depends on REP, recipient transport/correlation, special FEC and
used-goods review, and operational acceptance. Current FE native name and
positive payment allocation boundaries are already published in 0.10.0+.

## What Changes

- Define the coherent exact domestic V1 family contract spanning FE, ND, partial
  NC, rejected-FE replacement, TE, FEC, REP and recipient lifecycle.
- Keep every family slice additive, preserving retained 0.9 read-only custody,
  total-NC behavior and legacy Number APIs, while following current validation as
  published in 0.10.0 and later.
- Require independent Decimal oracles, exact JSON/XML boundaries, native XSD
  validation, synthetic signing/response tests and fresh packed consumers before
  release.
- Reference the published current-fe-input contract for native name and positive
  payment allocation boundaries instead of duplicating them.
- Keep REP blocked until an official monetary oracle exists.
- Keep recipient status, confirmation consecutive and Hacienda outcome distinct.
- Prepare intermediate linked releases from ready slices, recorded as partial
  closure with issue hacienda-cr #85 left open.
- Prepare the final hacienda-cr #85 closure release only after all required slices pass
  independent review and full verification.

## Capabilities

### New Capabilities

- `exact-domestic-v1-family-contracts`: coherent exact domestic V1 family
  contract, release gating and preserved compatibility boundaries.

### Modified Capabilities

None.

## Impact

Affected areas: shared exact schemas, SDK document builders/calculators, family
verification, package release process, app consumer tracking and issue hacienda-cr #85
closure. Related changes: exact-rep-source, add-exact-recipient-message,
add-used-personal-goods-fec, real-sandbox-acceptance-nc-nd-fec-rep and
strict-current-fe-native-boundaries. No fiscal activation, live provider call,
production deployment or app adoption is authorized by this change.
