# Tasks

## 1. Make the red step real

- [x] 1.1 Widen the case generator in `packages/sdk/src/documents/exact-fe-builder.spec.ts` to produce two to five mixed discounts per line, including at least one absolute before a percentage, and extend the inline Python oracle to return per-discount amounts computed on the remaining base; verify the spec fails against the current kernel.
  - Evidence: `exact-fe-builder.spec.ts` cases now carry one to five entries (even cases put an absolute before the percentages); the oracle returns per-entry amounts and the spec fails against a gross-based kernel.
- [x] 1.2 Change `packages/sdk/src/tax/exact-decimal.properties.spec.ts` so `GeneratedLine.descuento` is an array of one to five mixed entries and `oracleDiscount` folds the sequential base; add the monotonic-base, `Σ montoDescuento == totalDescuentos`, and absolute-never-rounded invariants; rewrite or remove the stale mutation at lines 461-470 that labels a sequential base as the mutant, replacing it with a mutation that resets the second percentage to `gross`; verify the suite fails against the current kernel.
  - Evidence: `exact-decimal.properties.spec.ts`; both the property and the new mutation test fail against a gross-based kernel.
- [x] 1.3 Add hand-computed cascade fixtures independent of both oracles for the ordinary kernel (`100` with two `10%` → `10.00000`, `9.00000`, subtotal `81.00000`, IVA `10.53000`, total `91.53000`) and for the used-personal kernel (same discounts, tax `0.00000`, total `81.00000`); verify both fail against the current kernels.
  - Evidence: `packages/sdk/src/tax/exact-discount-cascade.spec.ts` (17 of its tests fail against a gross-based kernel).
- [x] 1.4 Correct the NC and used-personal Decimal oracles (`exact-nc-builder.spec.ts:233` and `exact-fec-used-personal.spec.ts:43`) to fold the sequential base before any cascade case is added; verify each current gross-based oracle fails against the corrected kernel.
  - Evidence: both oracles fold the remaining base; their vectors now include an absolute followed by two percentages, so the specs fail against a gross-based kernel.

## 2. Correct both discount kernels

- [x] 2.1 Add the internal `applyDiscounts` and `applyFrozenGrossDiscounts` primitives to `packages/sdk/src/tax/exact-decimal.ts`, with a per-step guard in `applyDiscounts` that rejects `amount >= base` and a cumulative guard in `applyFrozenGrossDiscounts` (reject when the sum of discounts reaches the gross, as the published retained calculator did, so 50%+50% and 60+60 keep throwing the same `RangeError`), and verify unit tests cover percentage-only, absolute-only, mixed order, five entries, the `>=` guard, and the frozen gross base; confirm `tax/index.ts` does not re-export either primitive.
  - Evidence: `exact-discount-cascade.spec.ts` (`applyDiscounts`, `applyFrozenGrossDiscounts` and barrel blocks).
- [x] 2.2 Give `calculateExactOrdinaryMoney` an explicit `basis` parameter, replace the discount loops in `packages/sdk/src/tax/exact-ordinary.ts` and `packages/sdk/src/tax/exact-fec-used-personal.ts` with `applyDiscounts`, and call the retained path with `applyFrozenGrossDiscounts` from `packages/sdk/src/tax/exact-fe.ts`; verify the fixtures from 1.3, the updated oracles from 1.1, 1.2, and 1.4, and the existing 100 % discount compatibility test pass.
- [x] 2.3 Add cascade regression tests in `exact-te-builder.spec.ts`, `exact-nc-builder.spec.ts`, `exact-credit-extensions.spec.ts`, `exact-nd-builder.spec.ts`, `exact-fec-builder.spec.ts`, `exact-fec-foreign-service.spec.ts`, and `exact-fec-used-personal.spec.ts`; verify every family reports the same discount, subtotal, base, and tax for the same line.
  - Evidence: implemented as one table-driven spec, `exact-discount-cascade.spec.ts` ("cascade parity"), covering FE, FE replacement, TE, total NC, partial NC, ND, FEC, FEC foreign service and FEC used-personal goods, instead of one test per family spec file.
- [x] 2.4 Update the discount sections of `docs/specs/exact-ordinary-fe.md` and `docs/specs/exact-total-nc.md`, and the equivalent paragraphs in `docs/exact-te.md`, `docs/exact-nd.md`, `docs/exact-fec.md`, `docs/exact-foreign-service-fec.md`, `docs/exact-used-personal-goods-fec.md`, and `docs/exact-credit-extensions.md`; verify no document still describes the current discount as applying to the line gross and that the worked example matches the fixtures.
- [x] 2.5 Add a retained fixture with two percentage discounts, assert that `calculateRetainedExactFe` keeps the historical gross-based result (100 with two 10% → discounts 10.00 + 10.00, subtotal 80.00, IVA 10.40, total 90.40) while the current API returns 81.00/10.53/91.53, and update `docs/current-fe-native-boundaries.md:34-36` to name the frozen discount rule explicitly; verify the retained and current results diverge only by the two bases.
  - Evidence: `exact-discount-cascade.spec.ts` ("current API versus the frozen retained calculator").

## 3. Make payment presence conditional

- [x] 3.1 Add `paymentOptionalFor` and `requirePaymentPresence` in `shared/src/schemas/exact-fe.ts`, and verify unit tests cover `02`, `08`, `10`, a non-exempt condition, a supplied allocation, and an empty allocation.
  - Evidence: `shared/src/schemas/exact-payment-presence.spec.ts`. Both helpers stay module-internal: they are not exported from the package barrel, and the installed-consumer check asserts they are absent.
- [x] 3.2 Relax `medioPago` to optional with `max(4)` only in the current overrides: `exact-fe.ts` (line 225), `exact-te.ts`, `exact-fec.ts`, `exact-nc-partial.ts`, and `exact-nd.ts`, invoking the helper with `input.condicionVenta` or `input.original.condicionVenta` as the matrix in `design.md` specifies; leave `ExactFeStructureSchema.medioPago` and `exact-nc.ts` untouched, and verify schema tests accept omission for `02`/`08`/`10` and reject it otherwise.
- [x] 3.3 Guard the three remaining payment loops (`exact-nc-partial.ts:104`, `exact-nd.ts:99`, and `refineExactFecSource` in `exact-fec.ts:137`) with `input.medioPago?.forEach(...)` or `?? []`, and make `FecSourceFacts.medioPago` (`exact-fec.ts:104`) optional; verify schema tests show that a valid omission for NC partial, ND, and FEC returns validation errors rather than throwing `TypeError`.
- [x] 3.4 Propagate the optional shape through `exact-fec-foreign-service.ts`, `exact-fec-used-personal.ts` (governing condition literal `13`, never exempt), and `exact-fe-replacement.ts`, guarding every `medioPago` loop; verify each variant spec passes with an absent allocation where the rule allows it and that used-personal still rejects omission.
- [x] 3.5 Add the retained enforcement: define `RetainedExactFeCalculatedSchema` with a non-empty `resumenFactura.medioPago` and parse with it in `calculateRetainedExactFe`; verify the retained calculator still rejects an empty summary while the current calculator accepts it, and that the broad `ExactFeCalculatedSchema` decoder still reads a historical zero-allocation record.
  - Evidence: `shared/src/schemas/exact-payment-presence.spec.ts`.
- [x] 3.6 Add a table-driven test asserting presence is rejected for every non-exempt condition and accepted for `02`/`08`/`10` in every family, using the matrix in `design.md`, including the referenced original of total NC, partial NC, and ND.
  - Evidence: `packages/sdk/src/documents/exact-payment-presence.spec.ts`.
- [x] 3.7 Update the payment-presence sections of `docs/specs/exact-ordinary-fe.md` and `docs/specs/exact-total-nc.md`, and the equivalent paragraphs in `docs/exact-te.md`, `docs/exact-nd.md`, `docs/exact-fec.md`, `docs/exact-foreign-service-fec.md`, `docs/exact-used-personal-goods-fec.md`, and `docs/exact-credit-extensions.md`; verify no document still claims allocations are mandatory for `02`/`08`/`10` or for the retained contract.

## 4. Carry optional payments through calculation and XML

- [x] 4.1 Make `ExactFeSummarySchema.medioPago` optional in `shared/src/schemas/exact-fe.ts`, skip the `paid !== total` reconciliation when it is absent, keep the check when entries exist, and re-assert `min(1)` on the used-personal calculated summary in `shared/src/schemas/exact-fec-used-personal.ts`; verify calculation tests cover both branches, that a single supplied allocation must still equal the total, and that used-personal calculated output cannot be empty.
- [x] 4.2 Emit `ResumenFactura/MedioPago` only when entries exist in `buildExactOrdinaryFields` (`packages/sdk/src/documents/exact-fe-builder.ts`); verify XML tests show no node for exempt documents and unchanged output for documents with allocations.
- [x] 4.3 Apply the same conditional emission in `buildExactFecMonetaryFields` (`packages/sdk/src/documents/exact-fec-builder.ts`) and in `packages/sdk/src/documents/exact-fec-used-personal-builder.ts`; verify FEC `02` and FEC foreign service `02` produce no `MedioPago` node when the summary has no entries, and that used-personal rejects the omission at validation rather than reaching the builder.
- [x] 4.4 Add native `xmllint` cases for FE, TE, total NC, partial NC, ND, FEC, and FEC foreign service without `MedioPago` under both `2024/v4.4` and `2026/v4.4`, and verify each report valid.
- [x] 4.5 Update fixtures and examples that passed a placeholder allocation only to satisfy `min(1)`, and verify the focused suites pass without it.
  - Evidence: no exact-family fixture or example used an exempt condition with a placeholder allocation (the only 02 fixture, `CREDIT_INVOICE`, belongs to the legacy Number API), so nothing needed to change.

## 5. Release bookkeeping and integration

- [x] 5.1 Add a Changeset enumerating the six current inputs, the three derived variants, `ExactNcTotalInput`, the shared calculated shape, the three XML projections, the discount correction, the internal primitive, and the retained-contract and frozen-math guarantee; verify `pnpm changeset status` reports it.
  - Evidence: `.changeset/correct-exact-discount-and-payment-rules.md` (minor for shared and SDK). It does not name the internal primitive, which is not public API.
- [x] 5.2 Run the focused suites used in this change (`xsd-conformance.integration.spec.ts`, `exact-fe-builder.spec.ts`, `exact-te-builder.spec.ts`, `exact-nc-builder.spec.ts`, `exact-credit-extensions.spec.ts`, `exact-nd-builder.spec.ts`, `exact-fec-builder.spec.ts`, `exact-fec-foreign-service.spec.ts`, `exact-fec-used-personal.spec.ts`, `exact-decimal.properties.spec.ts`, `exact-ordinary-compatibility.spec.ts`) and verify they pass.
- [x] 5.3 Run `pnpm verify` from `hacienda-cr/` and verify formatting, lint, typecheck, builds, offline tests, script regressions, and installed-package checks pass.
- [x] 5.4 Regenerate one synthetic document for each affected family (FE, TE, total NC, partial NC, ND, FEC, FEC foreign service, FEC used-personal) with the corrected rules and validate each file with native `xmllint` against both schema generations; verify the exact count of generated files equals the count validated and all report valid.
  - Evidence: done in memory by the specs rather than as files: `exact-discount-cascade.spec.ts` validates one cascade document per family (nine families) and `exact-payment-presence.spec.ts` validates every exempt document without `MedioPago`. The FE replacement validates only against `2026/v4.4`, because its reference code 16 does not exist in `2024/v4.4`.

## Workflow follow-up

- Archive the change after review requirements are satisfied.
- Verify the archived specs reflect the corrected discount and payment rules.
