# Testing and verification

## Full offline gate

Use Node.js 22+ and pnpm as pinned in `package.json`. Install native `xmllint`
(`libxml2-utils` on Ubuntu; libxml2 on macOS with its bin directory on PATH).
The SDK runtime uses bundled WASM and does not require native xmllint.

```sh
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` checks formatting, then runs Turbo lint/typecheck/build/test,
script regressions, and installed-tarball tests. It removes `HACIENDA_USERNAME`,
`HACIENDA_PASSWORD`, and `HACIENDA_SANDBOX_E2E` from its child environment so live
credential tests stay disabled. CI also checks packed consumers on Node 22 and 24.

## Focused development

Package tests invoked directly do not run Turbo's dependency builds. Build first
on a fresh checkout and rebuild after changing shared or SDK code consumed by
another package.

```sh
pnpm build
# Clear live-test switches for direct test invocations.
env -u HACIENDA_USERNAME -u HACIENDA_PASSWORD -u HACIENDA_SANDBOX_E2E pnpm --filter @dojocoding/hacienda-sdk test clave.spec.ts
env -u HACIENDA_USERNAME -u HACIENDA_PASSWORD -u HACIENDA_SANDBOX_E2E pnpm --filter @dojocoding/hacienda-mcp test server.spec.ts
pnpm test:scripts
pnpm test:packages
```

`pnpm test:scripts` runs every `scripts/**/*.test.mjs` recursively (including
`scripts/spec-watch/spec-watch.test.mjs`), always with mocked HTTP and no
credentials.

The `env -u` examples use a POSIX shell. On other platforms, unset those variables
in the test process or use the full offline verification wrapper.
`pnpm test` runs through Turbo and builds before tests, but does not clear live
test variables. `test:watch` and `test:coverage` are available per package; the root
`pnpm test:coverage` runs coverage across packages. Clear live switches for those
commands too unless live access was explicitly authorized.

| Change                 | Useful focused evidence                                               |
| ---------------------- | --------------------------------------------------------------------- |
| Shared fields or enums | Shared schema tests and affected SDK builders/adapters                |
| XML or schema revision | Builder regressions, runtime validation, independent XSD conformance  |
| Tax totals             | Calculator and business-validation regressions with discounts/taxes   |
| Auth or HTTP           | Mocked token, deadline, cancellation, redirect, and retry tests       |
| Sequences              | Temporary-directory concurrency, reset, overflow, and lock tests      |
| CLI output             | Command errors, JSON/text output, and exit codes                      |
| MCP tools              | In-memory tool/resource contracts, error cases, mocked side effects   |
| Exports or bundling    | `pnpm test:packages` installed ESM, types, CLI, and MCP checks        |
| Schema drift           | `pnpm spec:check` (network, read-only); apply with `pnpm spec:update` |

For documentation-only edits, check formatting of the edited files, resolve local
links, and compare commands and claims to source/manifests. No new runtime tests
are needed solely to mirror documentation. Run the existing CI gate before merge.

## Isolation and live suites

Use mocked network calls, generated signing certificates, synthetic invoices, and
temporary `configDir` values. Never use real `~/.hacienda-cr` state for routine
verification. MCP creation allocates a sequence even though it returns a draft;
the server tests mock that allocation.

## Spec watching commands

`pnpm spec:check` and `pnpm spec:update` compare `packages/sdk/schemas/` against
what Hacienda publishes today; both need network, so neither runs inside
`pnpm verify`. `spec:check` is read-only (exit `0` clean, `1` differences, `2`
operational failure) and never writes the manifest or the vendored files.
`spec:update` writes real differences and stops before any write on a canary
failure or an unreachable surface; it never commits or stages. The offline
counterpart is `node scripts/spec-verify.mjs`, which `pnpm verify` already runs.
Routine development uses only mocked HTTP in `scripts/spec-watch/*.test.mjs`;
run the live commands only when authorized to touch the official surfaces.

`src/auth/auth.integration.spec.ts` in the SDK contacts the sandbox IDP when
`HACIENDA_USERNAME` and `HACIENDA_PASSWORD` are available. Credential presence
alone does not authorize an agent to run it.

The live lifecycle suite requires explicit `HACIENDA_SANDBOX_E2E=1` and runs via
`pnpm test:sandbox`. It requires credentials, a certificate/PIN, and a valid invoice
file with actual issuer/provider data and a fresh unique clave. It signs, submits
to the fixed sandbox, polls, and asserts acceptance. See
[contributing](../CONTRIBUTING.md#explicit-sandbox-acceptance-test) for the required
variables. Run it only for an explicitly authorized sandbox task.

Offline checks establish local behavior, schema conformance, and installed-package
compatibility. Report live suites as skipped when not run; do not claim they prove
Hacienda acceptance or certificate-chain trust. Never retry an ambiguous live
submission blindly: query the original clave first.
