# 0.14.0 preparation — 2026-11-26

The four public linked packages (shared, SDK, CLI and MCP) move from 0.13.0 to
0.14.0. Changesets selected four minor bumps and consumed all 15 pending
changesets. The private mock stays at 0.11.0 and is not a release target. No
package reaches 1.0.0.

## Included changes

- #121: vendored official 2025–2026 holiday calendar, with no inferred Monday transfers.
- #129: `submitAndWait` without a store checks status by clave after a resend gets a 400.
- #133: accounting and production gates documentation.
- #116: `node-forge` becomes an optional SDK peer, and the CLI depends on it directly.
- #134: exact discounts cascade on the remaining base, and `medioPago` becomes conditional.
- #122: exact decimal-text document DTOs, calculators and XML builders for all seven
  v4.4 documents and `MensajeReceptor`. CLI and MCP exact inputs cover FE only.
- #150: `InformacionReferencia` catalog semantics (supersedes #123 and #142–#145).
- #148: environment redaction ignores short and boolean-like values.
- #151: `classifyOutcome`, `reconcileByClave`, the callback envelope parser,
  `fetchWithTimeout` with construction-time error redaction, `Scope` and
  scope-aware MCP client caching.
- #152: documentation fix. A `reconcileByClave` `not_found` (404) does not prove
  non-receipt; runtime behavior is unchanged.
- #153: security floors. `node-forge` `^1.4.4`, `zod` `^4.6.7`,
  `fast-xml-parser` `^5.12.0` and `@modelcontextprotocol/sdk` `^1.32.2`, with
  patched transitive versions in the lockfile.
- #135 (openspec backfill) and #149 (sandbox evidence scripts) change repository
  tooling only and add no changeset.

## Migration notes

- **`node-forge` peer.** Callers of `loadP12` or `signXml` must add `node-forge`
  1.4.4 or later to their own dependencies. Without it, `loadP12` rejects with an
  actionable `SigningError`. The CLI installs it itself.
- **Exact discount cascade.** Each line discount applies to the base left after the
  previous discount. Only lines with a percentage after another discount change.
  Recompute `medioPago` allocations derived from the old totals.
  `calculateRetainedExactFe` keeps its frozen historical rule.
- **Optional `medioPago`.** It is required unless the governing sale condition is
  02, 08 or 10. When it is absent, the summary and XML have no `MedioPago`. Code
  that reads `resumenFactura.medioPago` must handle `undefined`.
- **REP `Numero` required.** An exact REP reference must carry `numero`. Code 17 is
  accepted only on the REP. Codes 99 require their `*Otros` text, and the reverse.
  IVA 07 requires `codigoTarifaIVA`, and IVA 08 requires `factorCalculoIVA`.
- **Strict decimal reference schema.** The new decimal DTOs validate decimal text
  against XSD bounds. `DecimalRepReferenceSchema` and
  `RepInformacionReferenciaSchema` are exported. CLI drafts saved by 0.13.0 with a
  numeric `tarifa` still load and keep their verbatim XML bytes.

See [MIGRATION.md](../MIGRATION.md) for correction patterns.

## Excluded

- **#120 (schema revert): held.** The 2026 v4.4 schema revision is mandatory
  since 2026-11-01, so reverting to the previous schema would emit documents
  against a superseded contract.
- **#124 (legacy `round5` HALF_UP): held.** It changes the bytes of legacy
  numeric documents, which the release keeps byte-stable.

## Verification

- `pnpm verify`: SDK 1,598 tests passed and 4 live tests skipped; 205 script
  tests passed. Packed-consumer checks also passed: ESM, strict TypeScript
  examples, CLI and MCP stdio, the no-parser optional-Forge boundary and CLI
  signing with a generated test P12.
- `pnpm test:coverage` passed. SDK `src`: 92.45% lines, 83.26% branches. Lines for MCP
  96.18%, CLI 46.71%, shared 68.44%, private mock 90.64%. The SDK total that
  v8 prints (57.05%) also counts the built `dist/` bundle and XSD/JSON assets
  loaded by packaged tests; the `src` figure is the one to compare with
  0.12.0 (93.08%). Percentage alone is not a correctness claim.
- Audit before #153 (main `0cc8be7`): `pnpm audit --prod` reported 37 findings
  (10 high, 17 moderate, 10 low). There were about 24 Forge advisories, all on
  the SDK peer and CLI dependency paths, including GHSA-jc66-7q78-782g
  (PKCS#12 MAC forgery) and GHSA-6qrw-m8cv-hcxf. There were also zod
  GHSA-mrhx-c7xc-m3w5, fast-xml-parser GHSA-474x-hrwr-fgx4, and MCP transitive
  body-parser, hono, @hono/node-server, qs, fast-uri and ip-address findings. The
  full audit reported 41.
- Audit after #153: `pnpm audit --prod` reports **0** findings. The full audit
  reports 4 moderate development-only findings: ExcelJS → uuid
  (GHSA-w5hq-g745-h8pq), vitest → @vitest/mocker (GHSA-qxg6-89mg-rqv8,
  GHSA-xp26-3454-mjgp) and typescript-eslint → minimatch (GHSA-g3hv-75wg-m249).
  None of them ships in a tarball, and nothing is suppressed. GHSA-86w9-cpqp-85rv
  was fixed upstream in Forge 1.4.1, and issue #69 can close after publication. See
  [Forge reachability](forge-reachability-audit.md).
- Nightly Mutation workflow: it has failed every night since its first scheduled
  run on 2026-10-22, not only since 2026-11-24. The four other matrix jobs pass.
  The `input` job fails its own floor check: `src/xml/input-limits.ts` scores
  60.71%, under its 65% floor, while Stryker's own break threshold of 45% passes.
  The source is byte-identical to the
  [2026-10-21 baseline](mutation-baseline-2026-10-21.json) (same SHA-256), which
  scored 69.64% with 5 `Timeout` mutants counted as detected. On CI those mutants
  (mostly `Regex`) complete and survive: 34/56 against 39/56. This is a
  measurement difference between the baseline machine and CI runners, not a code
  regression. The surviving regex mutants still mark weak tests of the input-limit
  patterns, which should be strengthened or the floor recalibrated from a CI run
  in a follow-up. No shipped defect was identified.

## Boundaries

This document prepares source. Publication requires the merged main commit,
annotated tag `v0.14.0`, workflow preparation and verified registry artifacts
under npm `latest`. A partial publication must be recovered from the saved
artifacts, as the [runbook](releasing.md) prescribes. Offline suites, XSD
conformance and signature checks do not establish Hacienda acceptance, live
reconciliation semantics, institutional certificate trust or legal eligibility.
No sandbox submission or live credential was used.
