# Contributing

Use Node.js 22+ and the pnpm version in package.json. With Corepack available,
run `corepack enable`; otherwise install pnpm 9.15.4 using the supported pnpm
installation instructions. Clone the repository, then:

```sh
pnpm install --frozen-lockfile
pnpm verify
```

Verification requires native xmllint for independent XSD conformance tests:
`sudo apt-get install libxml2-utils` on Ubuntu, `brew install libxml2` on macOS
if absent (add its bin directory to PATH), or libxml2 via your Windows development
environment. The SDK's runtime validation itself uses bundled WASM and needs no
system xmllint. Verification fails clearly when the conformance tool is absent.

`pnpm verify` checks formatting, lint, types, builds, offline tests, release-script
regressions and installed tarballs. It disables live credential tests even if
credentials are present in your shell. No real Hacienda documents are submitted.

## Working on one package

```sh
pnpm --filter @dojocoding/hacienda-sdk build
pnpm --filter @dojocoding/hacienda-sdk test:watch
pnpm --filter @dojocoding/hacienda-sdk test clave.spec.ts
pnpm --filter @dojocoding/hacienda-sdk test:coverage
```

Run pnpm build first when starting watch mode on a fresh clone; internal imports
use built workspace artifacts. Rebuild dependencies after changing shared types.
`pnpm test` builds its dependencies automatically. `pnpm test:coverage` generates
text and lcov reports for all packages using the matching Vitest v8 provider.
Review coverage for critical auth, signing, sequence and submission paths rather
than treating a global percentage as a correctness guarantee.

Keep secrets in environment variables; .env.example lists available names, but
.env is not automatically loaded by the SDK. Never commit certificates or PINs.
Document examples must compile against public package exports; the installed
consumer suite compiles the SDK quick-start under NodeNext and bundler resolution.

Open a PR with relevant behavior tests and `pnpm changeset` for published-package
changes. Avoid unrelated lockfile changes. The four packages are linked by
Changesets, but linked groups do not force every member to release on every change.
See [the release runbook](docs/releasing.md) before versioning or publishing.

## Explicit sandbox acceptance test

`pnpm test:sandbox` requires HACIENDA_SANDBOX_E2E=1 plus HACIENDA_USERNAME,
HACIENDA_PASSWORD, HACIENDA_P12_PATH, HACIENDA_P12_PIN and
HACIENDA_SANDBOX_INVOICE (path to a valid invoice JSON with actual issuer/provider
data and a fresh unique clave). It builds, signs, submits once to the fixed
sandbox environment and asserts acceptance after polling. This creates a real
sandbox document; it never selects production. Credentials alone do not enable
this suite. Default verification remains offline.
