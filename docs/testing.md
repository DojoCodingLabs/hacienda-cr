# Testing and verification

## Full offline gate

Use Node.js 22.13+ for repository tooling and pnpm as pinned in `package.json`. Install native `xmllint`
(`libxml2-utils` on Ubuntu; libxml2 on macOS with its bin directory on PATH).
Install `pdftotext` (`poppler-utils` on Ubuntu; `poppler` on macOS) for the
vendored PDF catalog freshness checks. The SDK runtime uses bundled WASM and does
not require these native verification tools. Python3 is also required for the independent exact ordinary FE Decimal oracle; the runtime exact calculator itself uses native BigInt and adds no Python dependency.

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

`pnpm spec:generate` renders the code catalogs in `shared/src/generated/`
from `packages/sdk/schemas/codes.json` (full mode runs `pnpm codes:extract`
first; `pnpm spec:generate -- --no-extract` renders from the committed file
and is what the `pnpm verify` lock runs). Never edit generated files by hand
(they start with `NO EDITAR`): the parity-freeze test
`shared/src/generated-parity.spec.ts` pins the published values, and the
verify lock fails if `git diff` or untracked files show drift under
`shared/src/generated/` — a generation failure is reported separately and
the diff is skipped. Regenerating currently adds about a second to
`pnpm verify`. The generator suite (`scripts/codes-generate/`) covers
idempotency, parity failures in both directions, `names.json` handling, and
write atomicity; `scripts/codes-lint-lock/` pins the ESLint rule that
rejects hand-written 1-2 digit catalog literals outside documented
exclusions.

The `env -u` examples use a POSIX shell. On other platforms, unset those variables
in the test process or use the full offline verification wrapper.
`pnpm test` runs through Turbo and builds before tests, but does not clear live
test variables. `test:watch` and `test:coverage` are available per package; the root
`pnpm test:coverage` runs coverage across packages. Clear live switches for those
commands too unless live access was explicitly authorized.

| Change                 | Useful focused evidence                                                  |
| ---------------------- | ------------------------------------------------------------------------ |
| Shared fields or enums | Shared schema tests and affected SDK builders/adapters                   |
| XML or schema revision | Builder regressions, runtime validation, independent XSD conformance     |
| Tax totals             | Calculator and business-validation regressions with discounts/taxes      |
| Auth or HTTP           | Mocked token, deadline, cancellation, redirect, and retry tests          |
| Sequences              | Temporary-directory concurrency, reset, overflow, and lock tests         |
| CLI output             | Command errors, JSON/text output, and exit codes                         |
| MCP tools              | In-memory tool/resource contracts, error cases, mocked side effects      |
| Exports or bundling    | `pnpm test:packages` installed ESM, types, CLI, and MCP checks           |
| Schema drift           | `pnpm spec:check` (network, read-only); apply with `pnpm spec:update`    |
| Catalog codes          | `pnpm spec:generate -- --no-extract`, the parity spec, and the lint lock |

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
failure or an unreachable surface; it never commits or stages. Its `spec:verify`
gate runs **after** those writes: if the gate fails, `spec:update` exits `2` and
leaves the diff on disk (no automatic rollback) — either review and commit it, or
discard it with `git checkout -- packages/sdk/schemas/`. Names scraped from a
surface are untrusted, so the watchers reject any name that becomes a traversal
after decoding, keep every write inside `packages/sdk/schemas/`, refuse
redirects that leave `https:`, and cap every download. The offline
counterpart is `node scripts/spec-verify.mjs`, which `pnpm verify` already runs.
Routine development uses only mocked HTTP in `scripts/spec-watch/*.test.mjs`;
run the live commands only when authorized to touch the official surfaces.

### Scheduled drift job (phase 1)

`.github/workflows/spec-drift.yml` runs `pnpm spec:check` on the 1st of each
month at 06:00 Costa Rica (`0 12 1 * *` UTC) and on manual dispatch. On
differences (exit `1`) it opens (or comments on) a GitHub issue labeled
`spec-drift` with the full report and a fingerprint marker; on any operational
failure it fails the job without touching issues and never prints "sin cambios".
The job is report-only: it never runs `spec:update`, never changes
`currentSet`, and never commits or opens PRs (`permissions: contents: read`).
Phase 2 — running `spec:update` from the job — does not exist yet; vendorization
stays manual. To retry manually:

```sh
gh workflow run spec-drift.yml --ref <branch>
```

A failed run (exit `2`) notifies by email only the last editor of the workflow
file, per GitHub's notification settings; a more reliable channel is backlog.

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

## Sandbox correction evidence

- [SDK fixes and validation iterations](testing/sdk-validation-iterations.md)
- [Sandbox 403 investigation and sanitized escalation packet](testing/sandbox-403-debug.md)
