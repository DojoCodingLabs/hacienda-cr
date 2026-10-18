# 0.8.0 source-only version readiness

This version PR consumes the reviewed history Changeset from merged source `88eea20cf821d2820ee27004e69477fa7104d6e3` (SDK PR 81). All four manifests and generated changelogs move from 0.7.0 to 0.8.0. It does not publish packages, create a tag or adopt them in Facturador Dojo.

The release corrects the observed read-only history contract and adapters. [Migration](history-contract.md) explicitly removes fictional totals/status/original XML, unsupported filters and completeness assumptions; metadata observations do not establish fiscal acceptance or original recovery. FE/NC source, calculation, rules, signing and POST code is byte-unchanged in this version PR. A new package version must not relabel immutable SDK 0.7 application proofs/cases or activate transport. The application remains pinned to 0.7 until separately reviewed adoption.

## Version and package checks

- Changesets declares the reviewed minor bump for shared, SDK, CLI and MCP; all pending Changesets are consumed and their full migration wording is preserved in generated changelogs.
- `pnpm install --lockfile-only` completed. The lock remains byte-identical to merged main: SHA256 `e51be02a4e4be19ca331d445b5404ceafd79d6cefe048700dd177b79a0073568`. Workspace links remain unchanged. Fresh package checks enforce that final tarball dependencies resolve to the same exact 0.8.0 package family.
- `pnpm verify` passed: formatting, 23 official spec integrity files, lint/types/build, 1,451 unit cases (shared 236, SDK 1,091, CLI 75, MCP 49), four deliberately skipped live SDK cases, 118 script regressions and fresh all-four installed tarball consumers (NodeNext/Bundler, real SDK history HTTP fixtures, CLI and MCP stdio).
- `pnpm test:coverage` passed for all four packages with the same 1,451 cases and four deliberate live skips. Statement/branch coverage: shared 74.73%/40.9%, SDK 95.25%/90.5%, CLI 31.65%/28.88%, MCP 96.19%/67.34%. This is measured coverage, not complete behavioral proof. The first sandboxed attempt denied synthetic loopback listeners; the permitted run with live credential/opt-in variables removed passed without source/test changes. Offline/native/synthetic checks do not establish real Hacienda acceptance or live history coverage.

## Audit and release gates

The current `pnpm audit --json` returns the same known high unpatched [Forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) and moderate [uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq), with no critical finding. `pnpm -r why` confirms Forge 1.4.0 through the SDK and uuid 8.3.2 only through root-development ExcelJS 4.4.0. Dependency versions and lock bytes are unchanged. No advisory suppression, override or clean-audit claim is made; see [existing reachability limits](forge-reachability-audit.md) and [security notes](security-hardening.md).

A reviewed/merged version commit, clean exact-main release preparation, registry preflight, exact tarball integrity, approved tag/workflow publication and all-four registry/provenance/fresh-consumer checks remain required by the [runbook](releasing.md). No `.release` snapshot from this unmerged version PR substitutes for that approved commit. Publication and application adoption need their own explicit authorization/evidence.
