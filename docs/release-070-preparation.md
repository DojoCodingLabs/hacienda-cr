# 0.7.0 release preparation

The version candidate follows merged exact-total-NC PR76 (`cf1db1e4bde37498643f77c8259c0a29e51033a1`, reviewed product head `578e406`). Changesets consumes its pending minor change and links all four packages at **0.7.0**. Workspace dependencies remain `workspace:*`; regenerating `pnpm-lock.yaml` produces no change. The packed-consumer check verifies that actual published manifests resolve every internal dependency to exact `0.7.0`.

This release adds only the named ordinary domestic IVA13 total-credit case for an immutable FE in CRC/USD. It preserves numeric/exact FE APIs and existing CLI/MCP behavior. It does not establish original acceptance, unused correction authority, the caller's trusted-clock ten-year eligibility, refund, rejected-FE replacement, real Hacienda acceptance or application activation. See [the release runbook](releasing.md), [exact NC contract](../packages/sdk/README.md) and [Forge reachability boundaries](forge-reachability-audit.md).

## Local verification

The clean isolated version-preparation checkout used Node 26.8.2, pinned pnpm 9.15.4 and native `xmllint`. The SDK CI also verifies supported Node 22/24 independently; local Node 26 results do not replace those jobs.

- `pnpm install --frozen-lockfile`, then pre-version `pnpm changeset status`: all four packages minor. `pnpm version-packages` and `pnpm install --lockfile-only` produce the reviewed versions/changelogs and consume the Changeset.
- `pnpm verify`: formatting, source specification verification, lint/types/build, shared 236, SDK 1087, CLI 71 and MCP 47 passing tests; four deliberately excluded live SDK cases remain skipped. Script regressions: 118 passed. Fresh tarball-installed metadata, TypeScript/ESM, SDK, CLI and MCP consumers passed.
- The 10 exact-NC tests include independent Python Decimal, native official NC XSD, signed synthetic NC, maximum values, strict references, fractional chronology and copied-fact rejection. These are offline/synthetic results.
- `pnpm test:coverage` passed all eight tasks. SDK aggregate statements/branches/functions/lines: 95.2/90.23/97.3/96.35 percent. Coverage repeats the same tests and is not additional acceptance evidence.
- `pnpm audit --json` exits 1 with one high unpatched `node-forge` finding (`GHSA-86w9-cpqp-85rv`) and one moderate `uuid` finding via root `exceljs` (`GHSA-w5hq-g745-h8pq`). Both remain visible; no override, suppression or dependency change was made. This is not a clean-audit claim.

After versioning, `pnpm changeset status` compares changed packages with main and reports no remaining Changeset; this is expected for a consumed version PR, not the pre-version intended-release report. The release script independently requires zero pending Markdown Changesets and all four exact tag-matching versions.

## Review and publication boundary

The ignored `.release/v0.7.0/release.json` and `packed/` are candidate artifacts only. Review all four SHA-512 integrities and packed internal dependencies, then independently compare fresh exact merged-main artifacts before authorizing the annotated tag. Version-PR preparation never tags or publishes. Preserve the existing provenance-capable GitHub workflow, exact-artifact recovery and explicit advisories; do not bypass provenance or change billing/authentication/policies. Registry versions/latest, integrity, SLSA source/tag/workflow, fresh installed consumers and signatures must all be verified after an authorized publication before announcing completion.
