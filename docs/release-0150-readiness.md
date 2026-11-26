# 0.15.0 preparation — 2026-11-26

The four public linked packages (shared, SDK, CLI and MCP) move from 0.14.0 to
0.15.0. Changesets selected four minor bumps and consumed all 12 pending
changesets. The private mock stays at 0.11.0 and is not a release target. No
package reaches 1.0.0.

## Included changes

- #166: `codigoTarifaIVA` is required only for IVA 01 and 07, not 08 (Anexo p. 38).
  The legacy 0.001 Number tolerance becomes a named internal constant with an
  unchanged value.
- #167: opt-in decimal HALF_UP rounding for the legacy Number calculators
  (`createLegacyCalculator({ roundingMode: "half-up" })`). The default
  `"legacy-tofixed"` stays byte-identical. This supersedes the held #124.
- #168: `reconcileByClave` `not_found` becomes inconclusive (`conclusive: false`,
  `httpStatus`, `evidence`, `observedAt`, `errorCause`), and the sandbox 400
  "no ha sido recibido" maps to it. Also adds the opt-in submission-identity
  guard (`identityStore`, `retrySameBytes`, `SubmissionIdentityError`).
- #169: REP and MensajeReceptor submission is refused with
  `UnsupportedDocumentFamilyError`. Adds the per-family support matrix:
  `getFamilySupport()`, `hacienda support`, and the MCP resource
  `hacienda://reference/family-support`. FEC is marked `unverified`.
- #171: `2026/v4.4` is declared the current schema set. Adds the `provider_id`
  profile field and `hacienda auth login --provider-id`. MCP accepts an
  alphanumeric `proveedorSistemas`. This salvages the useful parts of the held
  #120 without reverting the schema.
- #172: IVA 08 amount is `factorCalculoIVA × subtotal` on every path: legacy,
  exact, validator and MCP.
- #173: the CLI signs each clave once and guards submit retries with the
  identity store.
- #162, #176: runtime dependencies. `xadesjs` and `xmldsigjs` 3.1.0, `smol-toml`
  1.9.1, and `xpath` `^0.0.35`. Signed output is byte-identical to the 2.x
  libraries. #162 initially took `xpath` to 0.1.0; #176 pins it back, because
  `xml-core@3.1.0` peers on `^0.0.34 || ^0.0.35` and npm reported ERESOLVE.
  Dependabot now holds `xpath` below 0.1.
- #162: `engines.node` rises to `>=22.12`, the floor of the v3 signing
  libraries.
- #174: dev-tooling updates. It holds TypeScript 7 and `@types/node` 26, and adds
  the lock-timeout `cause` patch.
- Repository only, with no changeset:
  - #155 and #161: CI gates every PR and audits production dependencies; the
    download counter moves to the `metrics` branch.
  - #164: roadmap.
  - #165: mutation tests for input-limits.
  - #170: spec type-checking.
  - #156–#160 and #157: GitHub Actions bumps.

## Migration notes

- **Node 22.12.** The packages declare `node: >=22.12`. Node 22.0–22.11 is no
  longer supported.
- **IVA 08.** The amount is `factorCalculoIVA × subtotal`. Code 08 without a
  factor now throws. A factor on any other code, and exoneración on code 08, are
  rejected. Code 08 documents change bytes; all other documents keep them.
- **REP/MR submission.** `submitDocument()` and `submitAndWait()` now fail fast
  for these families. Their builders are unchanged.
- **`not_found` is inconclusive.** Never treat it as proof of non-receipt, and
  never use it as permission to resubmit. `kind` is unchanged.
- **`ProveedorSistemas`.** Set `provider_id` on production profiles. Without it,
  the CLI warns and keeps the issuer identification, which is correct only for a
  self-developed system.
- **Persistent `submitAndWait`, changed bytes.** It now raises
  `SubmissionIdentityError` (`DIFFERENT_BYTES`) instead of a plain `Error`. The
  message prefix is the same.

See [MIGRATION.md](../MIGRATION.md) for correction patterns.

## Open questions carried forward

These are listed in [docs/roadmap.md](roadmap.md):

- FEC POST `emisor` mapping (sandbox evidence pending).
- IVA 08 exoneración (P0-4c).
- REP code 17 type gap.
- Whether `provider_id` becomes mandatory in production profiles.

## Verification

- `pnpm verify` passed on the version branch:
  - SDK: 1,755 tests passed, 4 live tests skipped.
  - shared 331, CLI 119, MCP 78, private mock 32.
  - Script tests: 216 passed.
  - Packed-consumer checks (ESM, strict TypeScript, CLI and MCP stdio, optional
    Forge, CLI signing with a generated test P12) passed.
- `pnpm peers check`: no unmet peers after #176. Before it, `xpath` 0.1.0 missed
  the `xml-core@3.1.0` range.
- `pnpm test:coverage` passed.
  - SDK `src` (excluding fixtures): 92.46% lines, 84.22% branches. 0.14.0 had
    92.45% and 83.26%.
  - Lines for MCP 97.08%, CLI 51.90%, shared 68.48%, private mock 90.64%.
  - Percentage alone is not a correctness claim.
- `pnpm audit --prod`: **0** findings.
- Full `pnpm audit`: 2 moderate development-only findings, down from 4 in 0.14.0.
  Neither ships in a tarball, and nothing is suppressed.
  - ExcelJS → uuid (GHSA-w5hq-g745-h8pq)
  - Stryker → minimatch (GHSA-g3hv-75wg-m249)

## Boundaries

This document prepares source. Publication requires all of the following:

- the merged main commit
- annotated tag `v0.15.0`
- workflow preparation
- verified registry artifacts under npm `latest`

Offline suites, XSD conformance and signature checks do not establish any of
the following:

- Hacienda acceptance
- live reconciliation semantics
- institutional certificate trust
- legal eligibility

No sandbox submission or live credential was used.
