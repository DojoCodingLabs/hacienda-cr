# Current exact FE native names and positive allocations

This unreleased current-input correction preserves valid financial math/XML and
legacy Number APIs while closing two distinct gaps in released 0.9 exact FE.

## Current source contract

`ExactFeInputSchema`, `calculateExactFe` and `buildExactFacturaXml` require an
actual issuer name of 5–100 Unicode characters, receiver name of 3–100, and
3–80 for either supplied commercial name. Optional commercial names remain
optional; an explicitly supplied empty name is rejected. Bounds count Unicode
code points, including supplementary and combining characters, without trimming,
Unicode normalization, replacement text or taxpayer-data invention.

The unchanged 2026 native FE XSD defines these lengths in EmisorType and
ReceptorType (`FacturaElectronica_V4.4.xsd`, SHA256
`926ba81325bc21102755bd8e4e570a63caaca086e680a877c3a6d15d6ee8a62f`).
It cannot establish actual taxpayer identity or acceptance.

Every supplied `ExactFePaymentSchema` allocation is now strictly positive.
The current ordinary exact TE API uses that same public schema and inherits
this correction. The other unreleased ordinary source APIs already enforce
positive allocations. Missing, negative, Number, exponent and out-of-range facts
remain invalid; all positive splits must still reconcile exactly with calculated
totals. A zero split with an otherwise complete positive remainder is refused.
This is an allocation constraint, not a cash receipt or REP trigger.

The [current official annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf)
p. 56 requires supplied TotalMedioPago greater than zero (99 pages, SHA256
`6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`).
Native XSD admits zero structurally; passing XSD alone does not prove this rule.

## Historical schema/math and original custody

`RetainedExactFeInputSchema` and `calculateRetainedExactFe` retain their prior
read-only source/math acceptance for independently bound historical 0.6–0.9
producers. Their internal party/payment foundation is not the stricter current
input. `ExactFeSummarySchema` / `ExactFeCalculatedSchema` also retain broad
output-decoding shape, so an actual old zero-allocation calculated record is
readable. Calculated-output parsing is not a current source or authority API.

Historical readability does not make a short name native-conforming or establish
fiscal compliance, signature authenticity, acceptance or ownership. The genuine
0.9 builder omitted an unused `nombreComercial: ""` from actual XML; its absence
is preserved as observed, not replaced with fabricated text. Old zero allocations
remain native-valid structurally but fail the independent current business rule.
No original is reconstructed, re-signed, rewritten or submitted by compatibility.
There is no retained XML builder or permissive current flag.

Before selecting historical math, a consumer must independently bind its exact
reviewed package version/integrity/source, immutable document scope and original
bytes/hash. Fresh allocation/signing/POST must use the current published contract.
Historical NC read-only references and any fresh original eligibility must be
reviewed separately in app adoption; changing SDK installation alone grants no
compatibility authority.

## Future producer version and migration

Keep `FE-domestic-ordinary-iva13-v1`: the named economic case and valid output
remain unchanged. The complete producer tuple is not this string alone. The
minor Changeset schedules a future reviewed linked package version, whose exact
published version/integrity/source and consumer rule identity must distinguish
it from retained 0.9. Manifests remain unchanged here; no version number is
invented before the coherent release review. App proof/current/retained allowlist
and forward migration remain separate work, with no automatic relabeling of
stored 0.9 source, original bytes or financial authority.

## Evidence and limits

`node scripts/capture-fe-native-090.mjs` reproduces seven synthetic unsigned
source/math/XML fixtures using actual npm 0.9 SDK/shared artifacts in an owned
temporary consumer, checks exact recorded SRI and removes that consumer afterward.
It does not rebuild current source with a historical label. The committed fixture
records the published source commit and exact per-original SHA256. These data
contain no real records, certificate, credential or live fiscal acceptance.

Tests cover issuer 4/5/100/101, receiver 2/3/100/101, both commercial-name bounds,
Unicode/padded lexemes, zero/fractional-zero splits, positive exact splits with an
independent Decimal oracle, historical output decoding, native conformance
versus business rules, valid 0.9 golden outputs, synthetic signing and fresh
packed public contracts. Existing older historical credit/family tests remain.
SDK #69, REP monetary oracle, special FEC and recipient lifecycle remain open;
this source correction neither patches dependencies nor authorizes a release.

## Executed source verification

Final corrected `pnpm verify` completed successfully on 18 October 2026:
247 shared, 1,142 SDK, 75 CLI and 49 MCP unit tests passed (1,513 total), with
four intentionally disabled live SDK tests skipped. All 118 script regressions
and fresh all-four packed NodeNext/Bundler/ESM/CLI/MCP consumers passed, along
with format/lint/types/build/native-schema provenance checks. Strict OpenSpec
validation and `git diff --check` passed. The six focused SDK files passed 32
tests before the final full run; the new public-payment shared test is also
included in the full totals. These overlapping counts are not additional tests.

Earlier runs stopped at two test-only non-null assertions, then an inherited
pre-fix test expecting one-character current FE names. Those diagnostics are
preserved separately; the final test explicitly asserts current denial and
unchanged retained/legacy acceptance. The initial new-test assumptions also
mistook a fixture's existing commercial name for absence and expected native
rejection of 0.9's omitted empty commercial input; the corrected tests inspect
actual emitted bytes instead. No source authority or native schema was loosened
to resolve those failures. No publication or app/shared/cloud mutation occurred.
