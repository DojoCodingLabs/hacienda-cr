# 0.12.0 preparation — 2026-10-21

The four public linked packages advance from 0.11.0 to 0.12.0: shared, SDK, CLI
and MCP. This is an additive minor with one signature-emission fix; Number DTOs
and legacy calculators remain unchanged. The private mock stays 0.11.0 and is not
a fifth release target. Changesets selected exactly these four minor bumps.

[PR contract remediation](open-pr-remediation.md) maps all 12 pending PRs and the
remaining domain boundaries. New APIs enforce strict unsigned legacy XML inversion,
pinned and signed EPES policy binding, bounded official 2026 civil dates, immutable
persistent delivery and one atomic sequence/document ledger. All writers sharing
an upgraded config directory must use this version. Do not re-sign historical
records to conceal their old Target mismatch; no automatic replay or user-state
migration is performed.

## Verification

- `pnpm verify`: 1,744 workspace tests, 137 script tests, four intentional live skips;
  property gate 1,000 cases plus 100 XSD cases; actual packed TypeScript/ESM,
  embedded calendar, decimals, signature, parser, CLI and MCP consumers.
- `pnpm test:coverage`: SDK 93.08% lines / 84.26% branches, MCP 96.64% lines,
  CLI 33.87%, shared 62.55%, private mock 91.69%. The CLI/shared/parser gaps remain
  visible; percentage alone is not a correctness claim.
- Full mutation run: 1,008 mutants, 158 selected tests, 59.32% aggregate. Money
  80.23%, identity 65.04%, input 69.64%, XSD 71.43%, parser 50.52%. The independent
  per-module gate passes; counts/source hashes are retained separately. Scoped
  matrix selection and rejection of missing/unknown evidence are tested.
- Independent processes race first issuance; SIGKILL after durable commit preserves
  bytes and counters. Concurrency regression permits only one first POST;
  explicit resume queries only. No real credentials or submissions.
- Audit remains one high unpatched Forge advisory plus one moderate development
  ExcelJS/uuid advisory, with the previously assessed call paths. New dev-only qs
  findings were remediated through a typed-rest-client scoped 6.16.0 override;
  Vite and launch-editor protections from 0.11.0 remain. No suppression.

This document prepares source. Publication requires the reviewed main commit,
annotated Git tag `v0.12.0`, workflow preparation and verified registry artifacts
under npm `latest`. A partial indexing delay must use saved original artifacts,
never rebuilt replacements, as prescribed by the release runbook. No offline
check establishes Hacienda acceptance, revocation, legal eligibility or production
application activation.
