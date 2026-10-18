# Exact credit-extension verification checkpoint

Source baseline: SDK main `91ac6cf85c435359eb47eda9f6a5b33b06d2c4a1`.
This is source-only; manifests remain 0.9.0 and the dependency lock, official
schema bytes and existing producer/retained implementations are unchanged.

Final corrected `pnpm verify` completed successfully on 18 October 2026:

- Shared: 246 unit tests passed.
- SDK: 1,137 passed; four intentionally disabled live tests skipped.
- CLI: 75 passed; MCP: 49 passed.
- Script regressions: 118 passed.
- Fresh all-four packed consumer installation, strict TypeScript, native ESM,
  exact financial/XML assertions, CLI and MCP checks passed.
- Formatting, lint, type checks, build and native schema provenance checks passed.
- Strict OpenSpec validation for `add-exact-credit-extensions` passed.

The ten new focused tests cover partial credit and new replacement identity,
exact fractions/offsets and Unicode bounds, correlation/reference substitutions,
independent Python Decimal and financial overflow, original immutability,
current/base native XML behavior, legitimate synthetic signing and explicit
pinned response context. The packed consumer exercises both new shared and SDK
public contracts from actual generated tarballs, not repository source imports.

The initial focused pass had one incorrect synthetic chronology fixture that
changed dates without changing its clave; the corrected fixture preserves actual
identity. The first full verification stopped at a fixture-only wide-party type
annotation. It now uses the actual strict parser rather than a cast. Neither
initial result is represented as a full successful run.

No real credentials, network submissions, live Hacienda acceptance, legal age
oracle, concurrent financial ledger authority or app activation were exercised.
No adversarial cryptographic fixture was constructed. Independent exact-head
review is recorded below; full V1, special FEC, REP, recipient and security gates
remain open.

## Independent root source review

Root reviewed exact source `b9a193086c121ff81ec2cd4477c1c2afbe0b5524`:
strict new schemas, own identities, unchanged source/reference lexemes,
positive allocations, partial correlated-line math, rejected-source layout and
fresh replacement identity, native builders, public/packed consumers and primary
article19 separation. No source blocker was found. Root independently executed
four focused files: **36 tests passed**, including both new APIs, exact FE and
existing total-NC builder regressions. The author's complete verification above
was inspected separately. This documentation-only follow-up changes no runtime,
manifest, lock, vendor or release identity and establishes no application or
live fiscal acceptance.
