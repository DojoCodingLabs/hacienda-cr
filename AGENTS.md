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

Use Node.js 22+ and the pnpm version pinned in `package.json`.

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

- [Architecture](docs/architecture.md): ownership and document lifecycle.
- [Testing](docs/testing.md): local checks, isolation, and live-test boundaries.
- [Contributing](CONTRIBUTING.md): PR workflow and Changesets.
- [Migration](MIGRATION.md) and [SDK migration notes](packages/sdk/MIGRATION-v4.4.md).
- [v4.4 compliance](docs/specs/v4.4-compliance.md) and
  [security boundaries](docs/security-hardening.md).
- [SDK instructions](packages/sdk/AGENTS.md) and [MCP instructions](packages/mcp/AGENTS.md).

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
