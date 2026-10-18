# Current versus retained FE boundary

## Baseline and primary evidence

Implementation baseline is confirmed merged SDK main
`7d5891a7c96f5f084b2e97e4d33fbf7839a74537` (PR #89). Root reviewed the
current/retained separation and version-bound producer approach before edits. The unchanged 2026 FE native XSD SHA256 is
`926ba81325bc21102755bd8e4e570a63caaca086e680a877c3a6d15d6ee8a62f`.
Its EmisorType/Nombre (lines 970–982) requires 5–100 Unicode characters,
ReceptorType/Nombre (1024–1036) 3–100, and each supplied NombreComercial
(997–1006, 1038–1047) 3–80. Use the existing internal `exactPartyName` helper,
not UTF-16 length or normalization. Native conformance does not attest real
party identity.

The [current official annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf)
(99 pages, SHA256 `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`)
p. 56 requires each supplied TotalMedioPago greater than zero. The XML schema's
zero-inclusive decimal restriction does not enforce that business requirement.
Exact split allocations must still sum to the calculated total; allocation is
not evidence of cash received or REP eligibility.

## Minimal source architecture

1. Preserve the old party/payment structure as the internal read-only source
   foundation. `RetainedExactFeInputSchema` and `calculateRetainedExactFe` must
   retain their prior 0.6–0.9 acceptance/math; no recalculation of original bytes.
2. Export a current positive `ExactFePaymentSchema` using the unchanged money
   lexical bounds and companion checks. Retained source and calculated output
   decoding must reference the frozen internal broad payment schema instead.
   Otherwise tightening the shared exported payment schema would accidentally
   invalidate historical zero allocations, including output readers.
3. Build current `ExactFeInputSchema` from that foundation with `safeExtend` for
   native-bounded issuer/receiver/commercial names and current positive payment
   arrays, then preserve existing current family/credit-term refinements. Do not
   mutate shared EmisorSchema/ReceptorSchema, legacy Number types or retained
   validation objects.
4. Audit dependents: unreleased TE uses current exported payment schema; ND/FEC
   already enforce positivity explicitly. PR #89 partial/replacement do too.
   Keep existing output/error behavior for valid data, no arithmetic changes.
   Total NC's original current eligibility stays separate from historical
   read-only custody; no old signing/transport compatibility grant is added.

## Producer identity decision proposed for root review

Existing source case codes describe the ordinary financial case, not a complete
self-authenticating producer/version. SDK does not currently stamp an immutable
producer tuple into these inputs; the app independently captures exact package
version/integrity/source/schema/rules. Keep the existing case code because the
financial case and valid XML output do not change. Record the stricter contract
in a minor Changeset and migration notes; the eventual reviewed linked release
version is chosen by root only after coherent source work is ready. Do not guess
that version now, invent a new case discriminator, or relabel historical 0.9.

The consumer must explicitly distinguish that future exact published package
and current proof/rules identity from retained 0.9 (and prior reviewed tuples).
Historical decoding/math selects the read-only path only after producer/scope/
original byte and hash binding. A new package installation must not reinterpret
stored 0.9 data as fresh current source or create new signing/POST authority.
The app adoption/forward allowlist is a separate reviewed workstream.

## Regression matrix

| Boundary                                                   | Current producer                                    | Retained read-only / output                                         |
| ---------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| Issuer name 4 / 5 / 100 / 101 characters                   | reject / accept / accept / reject                   | preserve published 0.9 acceptance and bounds                        |
| Receiver name 2 / 3 / 100 / 101                            | reject / accept / accept / reject                   | preserve prior acceptance                                           |
| Each commercial name absent / empty / 2 / 3 / 80 / 81      | accept / reject / reject / accept / accept / reject | preserve original optional/minimum behavior                         |
| Supplementary/combining characters and padded actual names | count Unicode code points, preserve exact lexeme    | same immutable source/bytes                                         |
| Supplied split 0 or 0.00000 plus positive remainder        | reject before calculation/XML                       | schema/math/output decode remain readable                           |
| Split positive 0.00001 and exact remainder                 | accept, reconcile exact total                       | identical exact math                                                |
| Missing/negative/Number/overflow/wrong companion           | existing strict denial                              | unchanged bounds/companion behavior                                 |
| Native name-invalid old unsigned original                  | do not freshly build                                | preserve actual bytes/hash; do not assert native or fiscal validity |
| Valid 0.9 FE and existing family golden outputs            | identical                                           | identical                                                           |

Obtain actual npm 0.9 package bytes/SRI in an isolated producer consumer, not
rebuild current source with a historical label. Capture old schema/math and
original unsigned bytes for name/zero cases; native name failure is expected
and explicitly distinct from retained mathematical readability. Test current
consumer read/math without an old XML builder or rewritten original. Preserve
old 0.6–0.8 credit-day/family compatibility fixtures as well.

Verification: native name edges/current business-only zero negative,
independent Decimal for positive splits, synthetic legitimate signing and
existing pinned verifier regressions, strict types/public exports, full
`pnpm verify` and all-four fresh packed consumers. No live credentials,
Hacienda calls, app target/activation, vendor edits or adversarial fixtures.
SDK #69, REP monetary oracle, special FEC and recipient lifecycle remain open.
