# Correct exact discount cascade and conditional payment allocation

## Why

The exact monetary kernels compute every percentage discount on the line's gross
amount. `Anexos_V4.4.md:158` requires instead that each further discount be
calculated on the base left by the previous one, rounded HALF_UP to five decimals
(`Anexos_V4.4.md:105`). The XML stays XSD-valid while the line subtotal, tax and
document totals are fiscally wrong whenever a percentage discount is not the
first one in the line. Two absolute discounts are unaffected.

The exact schemas also require at least one `MedioPago` allocation for every sale
condition. `Anexos_V4.4.md:194` makes `MedioPago` mandatory except for sale
conditions `02`, `08` and `10`; `Anexos_V4.4.md:57` only fixes the 1–4 cardinality
when allocations are present, so it does not contradict the exception. The SDK
currently rejects legitimate documents that carry no allocation.

Both defects live in shared validation and arithmetic, not in one builder, so
they reach every exact current family, including the used-personal-goods kernel
that duplicates the discount formula. The read-only retained calculator is
deliberately excluded from the discount correction: it must keep reproducing
historical producer math, which was gross-based.

## What Changes

- Calculate percentage discounts sequentially on the remaining base instead of
  on the gross amount, for up to the five discounts already allowed per line. A
  supplied absolute `montoDescuento` keeps its exact value and reduces the base
  for the following discount, and is never re-rounded.
- Extract a shared, internal `applyDiscounts` primitive and use it from both
  current kernels: `exact-ordinary.ts` (FE, TE, total NC, partial NC, ND, FEC)
  and `exact-fec-used-personal.ts`. It is not re-exported by `tax/index.ts`.
- Freeze the historical gross-based rule in `applyFrozenGrossDiscounts` and route
  `calculateRetainedExactFe` through it, so the read-only retained acceptance and
  math documented in `docs/current-fe-native-boundaries.md:34-36` do not change.
- Reject a discount that consumes the whole remaining base (`amount >= base`)
  before subtracting, preserving the existing compatibility guard against a
  zero or negative net line.
- Update the independent Decimal oracle and the property-based oracle, which
  currently reproduce the gross-based rule and therefore cannot detect it. Their
  generators must produce two to five mixed discounts, including an absolute
  before a percentage, so the red step is real. The NC and used-personal Decimal
  oracles are corrected first because they encode the same gross-based formula.
- Make `medioPago` conditionally required: mandatory unless the governing sale
  condition is `02`, `08` or `10`; optional (0–4 entries) for those codes.
- Guard every `medioPago` loop and make `FecSourceFacts.medioPago` optional, so a
  valid omission never reaches an unguarded `forEach`.
- Omit `ResumenFactura/MedioPago` from XML when no allocation is supplied, and
  skip payment reconciliation in that case, in every projection: ordinary
  documents, `buildExactFecMonetaryFields`, and the used-personal builder.
- Declare the reconciliation rule as an SDK invariant: any supplied allocation
  must sum exactly to the document total. This is stricter than
  `Anexos_V4.4.md:58`, which requires the match when there are two or more
  allocations, and it is preserved to keep existing accepted sources valid.
- Keep the read-only retained contract unchanged: `RetainedExactFeInputSchema`
  and the retained calculated summary continue to require at least one
  allocation, and the used-personal calculated summary re-asserts `min(1)` even
  though the shared summary becomes optional.
- **BREAKING (type-level)** for consumers that dereference
  `resumenFactura.medioPago` unconditionally. The optional surface covers
  `ExactFeInput`, `ExactTeInput`, `ExactFecInput`,
  `ExactFecForeignServiceIva13Input`, `ExactNcPartialInput`, `ExactNdInput`,
  `ExactFeReplacementInput`, `ExactFecUsedPersonalGoodsNonSubjectInput`,
  `ExactNcTotalInput` (transitively, through its `original: ExactFeInputSchema`),
  the shared `ExactFeCalculated`/`ExactFeSummary` shape, and the corresponding
  builders.
- Preserve legacy `Number` APIs; they never compute percentage discounts and are
  out of scope.
- The change does not alter fiscal scope, supported tax regimes, signing,
  transport, or Hacienda acceptance claims.

## Capabilities

### New Capabilities

- `exact-payment-presence`: when an exact document must carry payment allocations
  and when it must omit them, across every exact family that shares the ordinary
  allocation contract.

### Modified Capabilities

- `monetary-integral`: the current exact kernels' discount base becomes
  sequential, the shared primitive is reused by the used-personal kernel, the
  retained calculator keeps its frozen historical base, and the property-based
  mutation scenario that currently treats a sequential base as the mutation is
  corrected.

## Impact

- `packages/sdk/src/tax/exact-ordinary.ts` and
  `packages/sdk/src/tax/exact-fec-used-personal.ts`: discount accumulation.
- `packages/sdk/src/tax/exact-fe.ts`: `calculateRetainedExactFe` selects the
  frozen historical discount rule.
- `packages/sdk/src/tax/exact-decimal.ts`: new internal `applyDiscounts` and
  `applyFrozenGrossDiscounts` primitives, deliberately not re-exported by
  `tax/index.ts`.
- `shared/src/schemas/exact-fe.ts`, `exact-te.ts`, `exact-fec.ts`,
  `exact-nc-partial.ts`, `exact-nd.ts`, `exact-fec-foreign-service.ts`,
  `exact-fec-used-personal.ts`, `exact-fe-replacement.ts`: payment presence,
  guarded payment loops, calculated-summary shape, and retained-summary
  enforcement.
- `packages/sdk/src/documents/exact-fe-builder.ts` (`buildExactOrdinaryFields`),
  `exact-fec-builder.ts` (`buildExactFecMonetaryFields`), and
  `exact-fec-used-personal-builder.ts`: conditional XML emission.
- Colocated specs, the inline Python Decimal oracles (including
  `exact-nc-builder.spec.ts` and `exact-fec-used-personal.spec.ts`),
  property-based tests, retained fixtures, and the exact-family docs
  (`docs/specs/exact-ordinary-fe.md`, `docs/specs/exact-total-nc.md`,
  `docs/current-fe-native-boundaries.md`, `docs/exact-te.md`, `docs/exact-nd.md`,
  `docs/exact-fec.md`, `docs/exact-foreign-service-fec.md`,
  `docs/exact-used-personal-goods-fec.md`, `docs/exact-credit-extensions.md`).
- The Changeset enumerates every optional-payment input, the three XML
  projections, the `ExactNcTotalInput` transitive break, the discount correction,
  the internal primitive, and the retained historical-rule guarantee.
- No new dependency, no network call, no schema vendoring change, and no change
  to `packages/sdk/schemas/manifest.json`.
