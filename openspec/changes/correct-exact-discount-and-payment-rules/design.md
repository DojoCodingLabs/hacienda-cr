# Design

## Context

See `proposal.md` — Why. Four facts shape the approach:

- Two current kernels implement discount arithmetic today.
  `packages/sdk/src/tax/exact-ordinary.ts:27-33` (FE, TE, total NC, partial NC,
  ND, FEC) and `packages/sdk/src/tax/exact-fec-used-personal.ts:23-26` duplicate
  the same gross-based formula with the same scale (`100n * SCALE` and
  `10000000n` are both 1e7). Fixing only the first leaves the used-goods family
  wrong.
- `packages/sdk/src/tax/exact-fe.ts:18-19` reuses `calculateExactOrdinaryMoney`
  for `calculateRetainedExactFe`, and `RetainedExactFeInputSchema` admits up to
  five discounts per line. Correcting the shared kernel would silently change
  historical retained math, which `docs/current-fe-native-boundaries.md:34-36`
  promises to preserve.
- Payment presence is declared in more than one place. `ExactFeStructureSchema`
  is the retained base and must keep its historical `min(1)`; the current
  schemas override it individually. NC total inherits `ExactFeInputSchema`;
  partial NC and ND instead project `input.original`.
- `MedioPago` XML is emitted in three projections: `buildExactOrdinaryFields`
  (FE/TE/NC/ND/replacement), `buildExactFecMonetaryFields` (FEC and FEC foreign
  service), and the used-personal builder.

The kernels are pure and deterministic: no clock, no network, no I/O.

## Goals / Non-Goals

**Goals:**

- Make the current discount cascade one shared rule, consumed by both current
  kernels, while the retained calculator keeps its frozen historical rule.
- Make payment presence one shared predicate with an explicit per-family source.
- Keep results identical for lines with zero or one discount and for documents
  that supply valid allocations.
- Keep XML byte-identical except for the two intended corrections: multi-discount
  lines in the current APIs, and exempt documents that omit `MedioPago`.
- Preserve the retained read-only source/math acceptance stated in
  `docs/current-fe-native-boundaries.md`.

**Non-Goals:**

- No new fiscal scope, tax code, tariff, or discount code.
- No change to legacy `Number` builders or calculators.
- No change to XSD vendoring, `manifest.json`, or signing/transport.
- No change to the read-only retained input/summary presence contract.
- No attempt to prove Hacienda acceptance.

## Decisions

### 1. Two primitives: current cascade and frozen historical base

Add two additive, **internal** primitives to
`packages/sdk/src/tax/exact-decimal.ts` (not re-exported by `tax/index.ts`):

```
applyDiscounts(gross, descuentos) ->
  compute each amount against a mutable sequential base
  throw if an amount is negative or amount >= base
  return the rounded amounts and the remaining base

applyFrozenGrossDiscounts(gross, descuentos) ->
  compute every percentage against the constant gross
  keep the same per-step bounds and return shape
```

The percentage branch of `applyDiscounts` rounds HALF_UP to five decimals on the
current base; the absolute branch uses `scaled(montoDescuento, 5)` unchanged and
never re-rounds. The base starts at `gross` and decreases by the already-reported
rounded amount, so `Σ montoDescuento == totalDescuentos` holds exactly.

`calculateExactOrdinaryMoney` gains an explicit `basis` parameter
(`"sequential" | "frozen-gross"`) and `calculateRetainedExactFe` calls it with
`"frozen-gross"`; every current calculator keeps `"sequential"`. Both kernels
(`exact-ordinary.ts` and `exact-fec-used-personal.ts`) use `applyDiscounts`.

`Anexos_V4.4.md:158` is the normative source for the current cascade and
`Anexos_V4.4.md:105` for HALF_UP. The frozen path is not an Anexo rule: it is a
historical compatibility exception.

**Why:** the rule exists twice in the current path; extracting it removes the root
cause instead of patching two copies. The explicit `basis` parameter makes the
retained exception visible at the call site instead of hiding it behind a second
calculator or a permissive flag.

**Alternatives considered:**

- Patch each current kernel independently — rejected: it leaves two sources of
  truth and the used-goods family is the exact case the previous plan missed.
- Apply the cascade to the retained calculator too — rejected: it changes
  historical math that `docs/current-fe-native-boundaries.md` promises to
  preserve and that no retained fixture currently exercises.
- Compute on unrounded bases and round only at the end — rejected: the reported
  `montoDescuento` values would not sum to `totalDescuentos`.

The guard uses `amount >= base` and runs before subtracting, so a discount that
consumes the whole remaining base fails with a clear error instead of producing a
zero or negative base that later surfaces as a misleading `money()` failure. This
matches the existing guard in `exact-ordinary.ts:43-45` and the expectation in
`exact-ordinary-compatibility.spec.ts:44-46`. The five-discount cap stays in the
input schema.

### 2. One payment-presence predicate with an explicit per-family source

Add to `shared/src/schemas/exact-fe.ts`:

- `paymentOptionalFor(condicionVenta)` returns true for `02`, `08`, `10`.
- `requirePaymentPresence(condicionVenta, medioPago, ctx)` adds an issue when the
  condition is not exempt and `medioPago` is absent or empty.

`medioPago` becomes optional with `max(4)` in the current schemas; the helper
enforces presence only when the rule requires it. The helper always receives the
condition that governs the document:

| Family                    | Governing condition | Source field                       | Exempt codes reachable |
| ------------------------- | ------------------- | ---------------------------------- | ---------------------- |
| Exact FE                  | own                 | `input.condicionVenta`             | 02, 08, 10             |
| Exact TE                  | own                 | `input.condicionVenta`             | 02, 08, 10             |
| Exact FEC                 | own                 | `input.condicionVenta` (`01`/`02`) | 02                     |
| Exact FEC foreign service | own                 | `input.condicionVenta` (`01`/`02`) | 02                     |
| Exact NC total            | original            | `input.original.condicionVenta`    | 02, 08, 10             |
| Exact NC partial          | original            | `input.original.condicionVenta`    | 02, 08, 10             |
| Exact ND                  | original            | `input.original.condicionVenta`    | 02, 08, 10             |
| Exact FE replacement      | own                 | `input.condicionVenta`             | 02, 08, 10             |
| Exact FEC used-personal   | literal             | `"13"`                             | none                   |

`Anexos_V4.4.md:194` is the presence rule. `Anexos_V4.4.md:57` fixes the 1–4
cardinality when allocations are present and is not a second presence rule.

Because `medioPago` becomes optional, every existing loop over it must tolerate
absence: `exact-nc-partial.ts:104`, `exact-nd.ts:99`, and
`refineExactFecSource` in `exact-fec.ts:137` become `input.medioPago?.forEach(...)`
(or iterate `?? []`), and `FecSourceFacts.medioPago` (`exact-fec.ts:104`) becomes
optional. `refineExactFecSource` is reused by FEC, FEC foreign service, and
used-personal, so one unguarded loop would turn a valid omission into a
`TypeError` in three families.

**Why:** partial NC and ND have no own `condicionVenta`; without naming
`input.original.condicionVenta` an implementer could pass an absent field or
assume the wrong value. The loop guards are part of the presence change, not an
optional cleanup: the validation path is where a valid omission first lands.

**Alternatives considered:**

- A Zod discriminated union on `condicionVenta` — rejected: it would explode the
  input types and break cross-field refinements.
- A per-family literal check — rejected: nine copies of one normative sentence.

### 3. Optional current summary, retained contract untouched

- `ExactFeStructureSchema.medioPago` (`exact-fe.ts:168`) stays `min(1)`: it is
  the base of `RetainedExactFeInputSchema`.
- `ExactFeInputSchema`'s override (`exact-fe.ts:225`) becomes optional.
- `ExactFeSummarySchema.medioPago` (`exact-fe.ts:293`) becomes optional for the
  current families.
- Add `RetainedExactFeCalculatedSchema`, which re-asserts a present, non-empty
  `resumenFactura.medioPago`, and parse with it in `calculateRetainedExactFe`.
  It is used only there; the broad `ExactFeCalculatedSchema` output decoder keeps
  its permissive historical shape so old zero-allocation records remain readable.
- `exact-fec-used-personal.ts` derives its calculated summary from
  `ExactFeSummarySchema`; re-assert `min(1)` on that calculated summary, because
  the used-personal input uses the literal `13` and can never omit payment.

**Why:** the retained contract is a read-only custody boundary documented in
`AGENTS.md`; relaxing it would silently change historical decoding. Keeping the
retained base intact and adding an explicit retained calculated schema preserves
that boundary without blocking the current API. Used-personal needs its own
summary assertion because inheriting the optional shared summary would contradict
its non-exempt input rule.

**Trade-off:** `ExactFeCalculated.resumenFactura.medioPago` becomes optional for
current consumers. That is a type-level break for unconditional dereference.

**Alternatives considered:**

- `default([])` — rejected: `z.infer` would make the input field required.
- Emit a zero allocation — rejected: semantically false and rejected by the
  positive-amount rule.

### 4. Reconciliation is an SDK invariant, stricter than the Anexo

The kernel keeps `paid !== total` as a hard error whenever `medioPago` has
entries, and skips it when absent. `Anexos_V4.4.md:58` only requires
`TotalComprobante` to match the sum when there are two or more allocations; the
SDK intentionally keeps the stricter rule for any supplied allocation so existing
accepted sources remain valid. This is declared in the spec, not presented as an
Anexo requirement.

**Why:** omitting allocations is a presence decision, not permission to send
inconsistent amounts.

### 5. Test oracles must be able to fail

The current generators cannot distinguish the two rules:

- `exact-fe-builder.spec.ts:164-171` adds one percentage and, optionally, a
  `0.00001` absolute **after** it.
- `exact-decimal.properties.spec.ts:160-166` models exactly one discount, and
  line 239 emits `[line.descuento]`.
- `exact-nc-builder.spec.ts:233` and `exact-fec-used-personal.spec.ts:43` compute
  each discount against the constant gross `g`.
- The mutation test at `exact-decimal.properties.spec.ts:461-470` compares gross
  against net for one discount and labels a sequential base as the mutant, which
  is now the required rule.

The change must first extend the generators to two to five mixed discounts,
including at least one absolute before a percentage, make the Python oracle
return per-discount amounts, and correct the NC and used-personal oracles before
adding cascade cases. The property oracle gains three invariants:

1. the base decreases monotonically and never goes negative;
2. `Σ montoDescuento == totalDescuentos`;
3. an absolute `montoDescuento` is never re-rounded.

A new mutation test must model a second percentage computed on `gross` and assert
the oracle rejects it; the stale `:461-470` case is rewritten or removed. Only
then is the red step real.

### 6. All three XML projections change together

`buildExactOrdinaryFields`, `buildExactFecMonetaryFields`, and the used-personal
builder must each emit `MedioPago` only when the summary has entries. Fixing only
the first leaves FEC `02` and used-personal with `summary.medioPago.map` on
`undefined`.

### 7. Changeset enumerates every surface

The changeset lists the six current inputs, the three derived variants,
`ExactNcTotalInput`, the shared calculated shape, the three XML projections, the
internal primitive, and the retained historical-rule guarantee. It is a minor
bump with the type-level break called out, not a one-line note about a single
field.

## Risks / Trade-offs

- **Existing current callers with two or more discounts change results** →
  intended correction; documented with a before/after example (100 with two 10%
  discounts: 80/10.40 → 81/10.53).
- **Retained historical math changes silently** → the retained calculator keeps
  `applyFrozenGrossDiscounts`, and a retained fixture with two percentages
  asserts 80/10.40 while the current API asserts 81/10.53.
- **Oracles and implementation updated together could hide a regression** → widen
  the generators first, observe the failure, then change the kernel; keep one
  hand-computed fixture independent of both.
- **A family that should require payment loses it** → the helper always receives
  the governing condition, and a table-driven test covers every family and code.
- **A valid omission throws `TypeError` in a refinement** → all three loops are
  guarded, `FecSourceFacts.medioPago` is optional, and omission tests cover NC
  partial, ND, FEC, FEC foreign service, and used-personal.
- **The retained contract drifts** → `ExactFeStructureSchema` keeps `min(1)`,
  `calculateRetainedExactFe` parses with `RetainedExactFeCalculatedSchema`, and
  the used-personal calculated summary re-asserts `min(1)`.
- **FEC or used-personal crashes on `undefined`** → all three projections are
  updated in the same task group, each with a no-node XML test where omission is
  legal.
- **Rounding drift between discounts and totals** → the next base uses the
  reported rounded amount.

## Migration Plan

Source-only change inside the SDK and shared packages; no persisted data or wire
format migration. Current documents that satisfied the old rule produce identical
XML unless they carried multiple discounts (wrong before) or an exempt condition
with a forced allocation (now may omit it). The retained read-only contract and
its historical math are unchanged. Rollback is a revert; no runtime flag is
introduced.
