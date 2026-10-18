# Exact partial NC and rejected-FE replacement matrix

## Actual source and primary evidence

Baseline `91ac6cf85c435359eb47eda9f6a5b33b06d2c4a1`, read-only audit in
`/private/tmp/hacienda-sdk-exact-credit-extensions`. Existing SDK exports total-NC
source/calculator/builder, no partial-NC producer and no exact FE reference field.
Legacy broad Number builders can carry references; they are not exact source
contracts or acceptance/remaining-balance authority.

- [Current official annex](https://www.hacienda.go.cr/docs/ANEXOS_Y_ESTRUCTURAS_V4.4.pdf), 99 pages, SHA256 `6e093226b29b38c5c8de825f70c1b1cb8ed81e2f4a6eb0b3ff52708fc1eb2769`; local `/private/tmp/hacienda-current-annex-v44-20261018.pdf` and same-basename text.
- [Official regulation 44739-H](https://www.hacienda.go.cr/docs/REGLAMENTO_DE_COMPROBANTES_ELECTRONICOS.pdf), SHA256`32da4200481b6c21522d4ace59e5255e15aae0624be077594dc65195189fe4fc`; local `/private/tmp/hacienda-current-comprobantes-regulation-20261018.pdf` and same-basename text. Articles 10/19 distinguish accepted-source correction from institutional rejection/new issuance. Receiver rejection is a different lifecycle.
- Unchanged 2026 NC XSD `packages/sdk/schemas/2026/v4.4/NotaCreditoElectronica_V4.4.xsd`, SHA256`b7ed3347c5599e78e5683d9ae83842695ab9497e173df9cd3be8d77c0851f556`.
- Unchanged 2026 FE XSD `packages/sdk/schemas/2026/v4.4/FacturaElectronica_V4.4.xsd`, SHA256`926ba81325bc21102755bd8e4e570a63caaca086e680a877c3a6d15d6ee8a62f`.

## Primary distinctions and caller authority

| Boundary                      | Primary evidence                                                       | Consequence                                                                                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Institutional rejected source | Regulation art. 10/19                                                  | No NC/ND to cancel an invalid document. New own identity and explicit rejected-document reference; no sequence reuse.                                                                    |
| Receiver rejection            | Regulation/technical resolution confirmation provisions; annex type 11 | Do not treat a commercial/recipient rejection as Hacienda rejection or automatically use type 10/code 16.                                                                                |
| Partial amount correction     | Annex pp. 57–58; Nota 9/p. 73 code 02                                  | Positive magnitude NC 03 using original FE 01 reference/code 02. Do not use total-cancellation01 or material-error14 without its separate policy.                                        |
| Cumulative credit ceiling     | Annex p.58                                                             | Actual cumulative NC adjustments cannot exceed original plus related ND. SDK math has no fresh concurrent ledger; app must enforce it atomically from verified immutable authority.      |
| Source informative facts      | Annex p.58                                                             | Original headers/currency/exchange/CABYS remain bound; no party or regime substitution in a partial credit.                                                                              |
| Rejected-document reference   | Annex Nota 10/p. 74 type 10, Nota 9/p. 73 code 16                      | Type10 is the rejected-by-Hacienda category; reason16 is replacement. Do not conflate type 16 foreign supplier or accepted-FE type 01.                                                   |
| Reference date/reason         | Annex p.58                                                             | Exact retained key/date and 3–180 Unicode reason, no normalized reference timestamp or invented reason. Actual ten-year trusted-calendar gate remains external.                          |
| Revision evidence             | Native 2026 vs base 2024                                               | New replacement reason16 is2026-only. Native2024 rejection is expected, not grounds to edit vendor files or switch to an unreviewed substitute code. Partial code 02 is present in both. |
| Money vs cash                 | Annex p.56, source/calculation scope                                   | Positive exact allocations reconcile credit/replacement totals; neither proves a refund, received cash or REP eligibility.                                                               |

## Proposed first partial-NC contract (requires root review)

Public additions: `ExactNcPartialInputSchema`, input/calculated types,
`calculateExactNcPartial`, `buildExactNotaCreditoPartialXml`.
Named case `NC-domestic-ordinary-fe-partial-iva13-v1` contains:

- Complete immutable current ordinary FE `original`, same party/currency/header
  eligibility restrictions as the reviewed ordinary NC/ND source, with new-case
  native issuer/receiver/commercial name bounds. No change to existing total-NC,
  FE or retained parsers.
- Own new NC 03 identity/time. Original FE 01 identity and ordinary math checked
  independently; SDK never supplies an accepted-source boolean.
- Ordered explicit `adjustments[{originalLineNumber,line}]`, each original line
  selected at most once in this first case. Retain original CABYS/classification/
  units/transaction/commercial correlation. Source amount facts are explicit
  positive incremental credit quantity/price/ordinary discount; never copied
  full-original totals or arbitrary final totals supplied by the caller.
- One exact original FE 01 reference, current amount-correction code 02 and actual
  reason. Preserve full-fraction chronology. This named amount-correction case
  does not claim returned-goods06, material-error14 or exoneration support.
- Independent positive payment allocations total exactly the calculated credit;
  no refund/cash effects. Existing BigInt kernel may calculate only the selected
  credit magnitudes, with no new FE identity or invented sale.

Proposed deliberately bounded initial policy: credit total is strictly positive
and less than the one original's calculated total. Equal total uses existing
full-NC API. This is a first-case API restriction, NOT the statutory cumulative
ceiling when ND/prior NC exist. App must separately verify current remaining
credit; it cannot use this SDK comparison as a concurrent balance assertion.
Credit exceeding the original but supported by related ND needs its own reviewed
capture/source contract, not a guessed cap or a permissive caller number. Root
must review this restriction before implementation; it is not approved by this
checkpoint. No invented per-line legal ceiling is proposed.

## Proposed rejected-FE replacement (requires root review)

Public additions: `ExactFeReplacementInputSchema`, input type,
`calculateExactFeReplacement`, `buildExactFacturaReplacementXml`.
Named case `FE-domestic-ordinary-rejected-replacement-iva13-v1` contains:

- `replacement`: independently valid NEW current ordinary FE source, exact math,
  own new FE 01 key/consecutive/emission and actual corrected source facts. New
  native-name constraints are scoped to this new API, not silently added to
  existing FE/current/retained producers.
- `rejected`: only retained rejected clave and declared emission timestamp,
  sufficient to bind the reference. A rejected XML may be structurally or
  mathematically invalid, so it must NOT be reparsed/recalculated as a valid
  ExactFeInput to permit correction. No SDK status boolean proves rejection.
- One mandatory type 10 reference/code 16, exact retained key/date and reason 3–180.
  New own identity must differ, and the new consecutive must not reuse the old
  embedded consecutive even with a different security code. First case may be
  limited to same issuer/old FE-type identity; do not silently support changing
  issuer/family or invent a corrected reference timestamp. Root reviews the exact
  old-key shape/issuer/date restriction before implementation.

Replacement parties/lines can contain actual reviewed corrections, since copying
invalid prior facts would defeat replacement. The app separately proves the
institutionally verified rejection, source/company scope, observed stored bytes,
new sequence intent and user authority, without resubmitting old signed bytes.
Old malformed reference identity/date cases need an explicit primary policy
rather than silent normalization. Do not replace a merely pending/unknown JSON
status, accepted source or recipient rejection under this named contract.

## Tests and scope boundaries before code

Partial vectors: full-precision source/reference chronology, own03/type 01/code 02,
negative/zero/Number injection, independent Decimal/maximum arithmetic, exact
partial vs total bounds, duplicate/foreign line metadata, split-positive/mismatch
allocations, wrong condition/family/name edges, immutable original and retained
published compatibility. Prove caller ledger is explicitly separate.

Replacement vectors: institutionally rejected reference category10/reason16,
new01 key and different sequence, no code 16 under base 2024, exact unchanged old
key/date, malformed/foreign source policy, new corrected source totals and native
XML, no accepted-source parser prerequisite for rejected material. Synthetic
signing and explicit generic pinned response mismatch tests never establish live
protocol acceptance, actual rejection or real certificate authority.

Full source PRs require strict OpenSpec, native current/base expectations,
independent Python Decimal, unchanged family/legacy goldens, fresh all-four packed
consumers and complete `pnpm verify`, then independent exact-head review. No
version bump/release/provider/cloud/app activation here. SDK #69 remains independent.
REP remains required while its primary monetary oracle is unresolved; special
FEC 05/06–13 and recipient lifecycle are not solved by these credit extensions.
