## Why

SDK #85 still lacks an exact REP producer. The current reduced native structure and
legacy Number fixture cannot determine the monetary meaning of partial payments.
A primary tax-first recovery rule requires separating cash, tax recognition and
XML projection before adding a complete named contract.

## What Changes

- Record primary/current-source evidence and the exact unresolved XML oracle.
- Specify two complete original-bound REP cases and the payment/tax authority,
  chronology, arithmetic, compatibility and acceptance requirements.
- Require reviewed current monetary evidence before implementing a public producer.
  This change is research/design only; no source, package or fiscal activation.
- Declare that this change blocks any real sandbox REP submission until the
  partial-payment XML oracle is independently reviewed.

## Capabilities

### New Capabilities

- `exact-rep`: exact source-bound payment-receipt production, pending oracle review.

### Modified Capabilities

None in this research checkpoint.

## Impact

SDK #85, Facturador Dojo fiscal/payment/tax-register boundaries and eventual coherent
linked release. Legacy REP and published current/retained FE/NC are unchanged.

Archive gate: this change must not be archived as implemented behavior. It is a
research/design checkpoint; archiving it would create a main spec describing a
producer that does not exist.

Cross-change impact: `real-sandbox-acceptance-nc-nd-fec-rep` must not run a REP
POST until the oracle in this change is resolved. Its design claim that the SDK
already has exact source contracts for REP is incorrect and must be corrected.
