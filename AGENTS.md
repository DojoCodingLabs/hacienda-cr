# Agent instructions

## Start here

This repository provides Costa Rica electronic invoicing through four ESM
TypeScript packages. Read the nearest package AGENTS.md before changing that
package. Use source, package manifests, and CI as the authority for current
behavior; update related documentation when behavior changes.

- `shared/`: shared types, Zod input schemas, constants, and enums.
- `packages/sdk/`: authentication, tax calculations, clave generation, XML,
  signing, configuration, and the Hacienda HTTP API.
- `packages/cli/`: the `hacienda` command, wrapping SDK operations.
- `packages/mcp/`: SDK tools and resources over MCP stdio.

Dependency direction is `shared → SDK → {CLI, MCP}`. CLI and MCP also import
shared directly. Put reusable domain logic in shared or SDK, not in an adapter.

## Workflow and verification

Use Node.js 22.13+ for repository tooling and the pnpm version pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` is the CI gate: formatting, lint, types, builds, offline tests,
script regressions, and installed-package checks. It requires native `xmllint`
and explicitly disables live credential tests. See [testing](docs/testing.md)
for focused commands and prerequisites. Workspace imports resolve built outputs;
rebuild dependencies before running package tests directly.

Inspect `git status` before editing. Preserve existing changes and untracked
files; isolate work in a separate checkout when necessary. Do not reset, stash,
commit, or format unrelated work. Stage only files belonging to the task.
For documentation edits, format the changed files rather than running the
repo-wide formatter in write mode.

## Code and public contracts

- Use strict TypeScript, ESM, `.js` relative import specifiers, and type-only
  imports. Follow colocated code for naming and error conventions.
- Use shared Zod schemas for public input validation and SDK helpers for domain
  calculations. Keep schemas, types, XML builders, examples, and adapter inputs
  consistent when changing a field.
- Tests are colocated `*.spec.ts`; use behavior regressions for substantive
  changes. Do not weaken assertions or validation to make a fixture pass.
- Review package barrel exports and installed-consumer tests when changing public
  APIs or build configuration. Test source imports alone cannot verify npm usage.
- Add a Changeset for published-package behavior changes. Documentation-only
  guidance changes do not require a package version bump.

## Operational boundaries

Use synthetic fixtures, mocked HTTP, and temporary configuration directories for
routine development. Never read or alter a user's `~/.hacienda-cr` state to make
an offline test pass. Do not log or commit passwords, tokens, PINs, private keys,
certificates, or real customer invoice data.

Credentials being available is not authorization to use them. Live authentication,
sandbox submissions, production operations, real sequence resets, and npm
publishing require explicit task authorization. An authorized operation does not
need another confirmation. `pnpm test:sandbox` submits a real sandbox document;
do not use it as routine verification. Refer to [the release runbook](docs/releasing.md)
for versioning and publishing.

Distinguish input/business validation, XSD conformance, signature authenticity,
and Hacienda acceptance. Passing one does not establish the others. After an
ambiguous submission failure, query the same clave before deciding to resubmit.

## Documentation map

- [Forge reachability and nested-DER regression](docs/forge-reachability-audit.md): historical source trace and current native response-verifier boundary; advisory remains open.

- [Pause and continuation checkpoint](docs/pause-context-2026-10-18.md): all eight issue dispositions, published versus source-only identity and explicit resume criteria.
- [Published 0.10.0](docs/release-0100-published.md): exact registry bytes, provenance, single indexing recovery and remaining fiscal/application gates.
- [0.10.0 preparation](docs/release-0100-readiness.md): completed exact-source APIs, remaining REP/recipient transport boundaries and reviewed release gates.
- [Recipient transport correlation](docs/mr-transport-correlation-research.md): exact primary evidence and required receiver-specific outcome oracle.
- [REP monetary oracle](docs/rep-monetary-oracle-research.md): primary sources, reproducible native counterexamples and incomplete exact-producer gates.

- [Published 0.7.0 release](docs/release-070-published.md): exact artifact/provenance verification, indexing recovery and advisory limits.
- [0.8.0 source-only readiness](docs/release-080-readiness.md): version preparation, history migration and remaining publication/adoption gates.

- [Architecture](docs/architecture.md): ownership and document lifecycle.
- [Testing](docs/testing.md): local checks, isolation, and live-test boundaries.
- [Contributing](CONTRIBUTING.md): PR workflow and Changesets.
- [Migration](MIGRATION.md) and [SDK migration notes](packages/sdk/MIGRATION-v4.4.md).
- [v4.4 compliance](docs/specs/v4.4-compliance.md) and
  [security boundaries](docs/security-hardening.md).
- [OpenSpec root](openspec/README.md): capability specs, changes in flight and their
  archive — the planning contracts live with the code, not outside the repository.
- [SDK instructions](packages/sdk/AGENTS.md) and [MCP instructions](packages/mcp/AGENTS.md).

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

## Exact ordinary FE boundary

Preserve legacy Number APIs. The additive exact FE API supports only its named
ordinary IVA13/full-payment case; financial strings must remain exact through
strict schema, BigInt calculation, JSON and XML. Do not normalize to Number,
silently drop unsupported regimes or relax official XSD bounds. Preserve
independent Python Decimal, native xmllint and fresh packed-consumer checks;
none establishes real Hacienda acceptance or authorizes activation/publication.

History wrappers expose observed metadata and raw range headers, not XML/status/totals or complete-history authority. Preserve strict pre-auth filter validation, exact string identity/clave and cancellation. See [history contract and migration](docs/history-contract.md); release/adoption and live history evidence remain separate.

Current exact FE requires positive 1–5 digit credit days for 02/10 (and any present
term). Preserve the explicit read-only retained schema/calculator boundary; do
not add a retained XML/signing/POST builder or a permissive current-API flag.
Historical consumer selection requires independently reviewed immutable producer
and byte bindings. See [credit-term contract](docs/exact-fe-credit-terms.md).
