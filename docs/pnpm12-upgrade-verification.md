# pnpm 12 current-source verification

18 October 2026. This refreshes [PR #41](https://github.com/DojoCodingLabs/hacienda-cr/pull/41)
onto reviewed SDK main `e5e3557f19d5a9b5b6bc9238f8f749198f2e1b3b`.
The earlier PR's Windows subprocess failures remain historical evidence, rather
than the result of this current isolated macOS verification.

## Scope and reproducibility

Repository tooling pins **pnpm 12.10.1**. Its npm integrity is
`sha512-ukCjfrGjcNYP6oxM8dNkwTvMzvUY6YrSvO6VT1OdONo3RY5YJho/pV4GUjRQ6g//+fSXsTW+QfLBXBZCusrObA==`.
The first YAML document in `pnpm-lock.yaml` records that package manager and its
platform artifacts. The second document is the application dependency graph;
its parsed content is identical to the former single document on this baseline.
Its sorted compact-JSON SHA-256 is
`17b431278f3cad286ecb8bddfa17ec0ed2c1c28b587129c4a644637ae16b3794`.
No published package manifest, API, version, application dependency or dependency
integrity changes. No performance improvement was measured.

The existing esbuild override moves from the root manifest to the workspace
configuration. Only `esbuild@0.28.2` is approved for dependency lifecycle builds;
there is no wildcard approval or ignored-build suppression. The actual clean
install executed only that dependency's postinstall, plus the repository's own
Husky prepare script. Project scripts are distinct from dependency build approval.
The existing `.npmrc` contains only `shamefully-hoist=false`; pnpm 12 reads
nonauthentication settings from the workspace, and its default already preserves
that false value. No machine configuration, registry authentication or global
package manager is changed by this migration.

The private root manifest requires Node.js >=22.13 for repository tooling.
[Official installation guidance](https://pnpm.io/installation) requires 22.13+
for npm-based pnpm installation; pnpm 12 itself is a native executable.
All four **published** packages retain their existing Node.js >=22 engines.
CI's existing Node 22/24 matrix, runner configuration and release provenance
workflow are unchanged. This local checkpoint does not claim a new CI,
Windows or cross-version execution result.

Primary configuration references:

- [Workspace configuration](https://pnpm.io/settings): settings ownership and
  authentication-only `.npmrc` handling.
- [Build policy](https://pnpm.io/settings/build#allowbuilds): exact matchers and
  default refusal of unreviewed dependency builds.
- [Frozen lockfiles](https://pnpm.io/settings/store#frozenlockfile): installation
  must fail instead of rewriting a missing/outdated lockfile.

## Checks and limits

A fresh temporary clone used Node.js 26.8.2 and the exact native pnpm 12.10.1,
installed only into a temporary CLI directory with a separate temporary store.
The initial frozen install passed without changing the committed lockfile.
Full `pnpm verify` passed formatting, specs, lint, types, builds, **1,536 unit
tests**, **119 script tests**, and installed-package metadata, strict TypeScript,
ESM SDK, CLI and MCP consumers. Four live tests were intentionally skipped.

The additional real-CLI regression
[`pnpm-build-policy.test.mjs`](../scripts/pnpm-build-policy.test.mjs) installs a
harmless local tarball with an unreviewed postinstall using this repository's
actual workspace policy. The install must exit with `ERR_PNPM_IGNORED_BUILDS`,
and the script's marker file must remain absent. It uses offline mode and an
owned temporary consumer/store; it neither requests the registry nor edits
shared/global configuration. A failed install alone is insufficient: the test
requires that exact policy error and verifies the script did not run.

Reproduce after selecting the pinned CLI:

```sh
pnpm --version
pnpm install --frozen-lockfile
node --test scripts/pnpm-build-policy.test.mjs
pnpm verify
```

The build-policy regression is also included by `pnpm test:scripts`. The
final full verification includes that additional policy regression; the initial
pre-regression run passed 118 script tests. The existing high Forge runtime advisory and moderate development uuid advisory
remain independently tracked; changing the installer does not patch them.
No Changeset, npm publication, live Hacienda operation or cloud setting change
is part of this tooling migration.
